const Apify = require('apify');
const cheerio = require('cheerio');

const { log } = Apify.utils;

const { testHtml } = require('./checkers.js');
const { toSimpleState } = require('./utils.js');

Apify.main(async () => {
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);

    const {
        startUrls,
        pseudoUrls = [],
        linkSelector,
        maxConcurrency,
        maxPagesPerCrawl,
        saveSnapshots = false,
        type = 'cheerio',
        proxyConfiguration = { useApifyProxy: true },
        replicateStartUrls = 0,
        retireInstanceAfterRequestCount = 10,
        headfull = false,
        useChrome = false,
        waitFor,
    } = input;

    if (type === 'cheerio') {
        log.info('Running a Cheerio Crawler. Cheerio downloads only initial HTML. If you need to render JavaScript or wait on a page for data to load, choose Puppeteer as Type of Crawler.');
        if (waitFor) {
            log.warning(`waitFor parameter doesn't work in Cheerio. If you need to wait, please choose Puppeteer as Type of Crawler.`);
        }
        if (headfull) {
            log.warning(`headfull parameter doesn't work in Cheerio. If you need to use headfull browser, please choose Puppeteer as Type of Crawler.`);
        }
        if (useChrome) {
            log.warning(`useChrome parameter doesn't work in Cheerio. If you need to use Chrome browser, please choose Puppeteer as Type of Crawler.`);
        }
    }

    const proxyConfigurationClass = await Apify.createProxyConfiguration({
        groups: proxyConfiguration.apifyProxyGroups,
        countryCode: proxyConfiguration.apifyProxyCountry,
    });

    const defaultState = {
        recaptcha: [],
        distilCaptcha: [],
        hCaptcha: [],
        statusCodes: {},
    };

    const state = (await Apify.getValue('STATE')) || defaultState;

    const requestQueue = await Apify.openRequestQueue();

    for (const req of startUrls) {
        await requestQueue.addRequest({
            ...req,
        });
        for (let i = 0; i < replicateStartUrls; i++) {
            await requestQueue.addRequest({
                ...req,
                uniqueKey: Math.random().toString(),
            });
        }
    }



    const handleFailedRequestFunction = ({ request }) => {
        state.total.push({ url: request.url });
        const error = request.errorMessages[0];
        console.log(`Request failed --- ${request.url}\n${error}`);
        if (error.includes('request timed out')) {
            state.timeouted.push({ url: request.url });
        } else {
            state.failedToLoadOther.push({ url: request.url });
        }
        // CheerioCrawler obscures status code >=500 to a string message so we have to parse it
        const maybeStatusCheerio = error.match(/(\d\d\d) - Internal Server Error/);
        if (maybeStatusCheerio) {
            const statusCode = Number(maybeStatusCheerio[1]);
            if (!state.statusCodes[statusCode]) {
                state.statusCodes[statusCode] = [];
            }
            state.statusCodes[statusCode].push({ url: request.url });
        }
    };

    const basicOptions = {
        maxRequestRetries: 0,
        maxRequestsPerCrawl: maxPagesPerCrawl,
        maxConcurrency,
        requestQueue,
        handlePageFunction,
        handleFailedRequestFunction,
        proxyConfiguration: proxyConfigurationClass,
        useSessionPool: false,
    };

    let crawler;
    if (type === 'cheerio') {
        crawler = new Apify.CheerioCrawler({
            ...basicOptions,
            additionalMimeTypes: ['application/xml'],
        });
        // We don't want the crawler to throw errors on bad statuses
        crawler._throwOnBlockedRequest = () => {};
    } else if (type === 'puppeteer') {
        crawler = new Apify.PuppeteerCrawler({
            ...basicOptions,
            launchContext: {
                stealth: true,
                useChrome,
                launchOptions: {
                    headless: headfull ? undefined : true,
                },
            },
            browserPoolOptions: {
                retireBrowserAfterPageCount: retireInstanceAfterRequestCount,
            },
        });
    }

    await crawler.run();

    await Apify.setValue('OUTPUT', toSimpleState(state));
    await Apify.setValue('DETAILED-OUTPUT', state);
    console.log(`Simple output: https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/OUTPUT?disableRedirect=true`);
    console.log(`Detailed output: https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/DETAILED-OUTPUT?disableRedirect=true`);
});
