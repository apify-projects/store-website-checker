const Apify = require('apify');
const cheerio = require('cheerio');

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
    } = input;

    const proxyUrl = proxyConfiguration.useApifyProxy
        ? Apify.getApifyProxyUrl({ groups: proxyConfiguration.apifyProxyGroups, country: proxyConfiguration.apifyProxyCountry})
        : null;

    const defaultState = {
        timeouted: [],
        failedToLoadOther: [],
        accessDenied: [],
        recaptcha: [],
        distilCaptcha: [],
        statusCodes: {},
        total: [],
    };

    const state = (await Apify.getValue('STATE')) || defaultState;
    Apify.events.on('migrating', async () => {
        await Apify.setValue('STATE', state);
    });

    setInterval(async () => {
        await Apify.setValue('STATE', state);
    }, 10000);

    setInterval(() => {
        console.dir(toSimpleState(state))
    }, 10000);

    const requestQueue = await Apify.openRequestQueue();

    for (const req of startUrls) {
        await requestQueue.addRequest({ ...req, headers: {'User-Agent': Apify.utils.getRandomUserAgent() } });
        for (let i = 0; i < replicateStartUrls; i++) {
            await requestQueue.addRequest({ ...req, uniqueKey: Math.random().toString(), headers: {'User-Agent': Apify.utils.getRandomUserAgent() } });
        }
    }

    const handlePageFunction = async ({ request, $, html, page, response }) => {
        let screenshotUrl;
        let htmlUrl;
        if (saveSnapshots) {
            const key = `SNAPSHOT-${Math.random().toString()}`;
            if (page) {
                await Apify.utils.puppeteer.saveSnapshot(page, { key });
                screenshotUrl = `https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/${key}.jpg?disableRedirect=true`
                htmlUrl = `https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`
            } else {
                await Apify.setValue(key, html, { contentType: 'text/html' });
                htmlUrl = `https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`
            }

        }
        state.total.push({ url: request.url, screenshotUrl, htmlUrl });

        let statusCode;
        // means Cheerio
        if ($) {
            statusCode = response.statusCode;
        } else {
            statusCode = response.status();
        }

        if (!state.statusCodes[statusCode]) {
            state.statusCodes[statusCode] = [];
        }
        state.statusCodes[statusCode].push({ url: request.url, screenshotUrl, htmlUrl });

        if (!$) {
            html = await page.content();
            $ = cheerio.load(html);
        }
        const testResult = testHtml($);
        for (const [testCase, wasFound] of Object.entries(testResult)) {
            if (wasFound) {
                state[testCase].push({ url: request.url, screenshotUrl, htmlUrl });
            }
        }

        if (linkSelector) {
            await Apify.utils.enqueueLinks({
                $,
                selector: linkSelector,
                pseudoUrls: pseudoUrls.map((req) => new Apify.PseudoUrl(req.purl)),
                requestQueue,
                baseUrl: request.loadedUrl,
                transformRequestFunction: (request) => {
                    request.headers = { ...request.headers, 'User-Agent': Apify.utils.getRandomUserAgent() }
                    return request;
                }
            });
        }
    }

    const handleFailedRequestFunction = ({ request }) => {
        state.total.push({ url: request.url });
        const error = request.errorMessages[0];
        console.log(`Request failed --- ${request.url}\n${error}`)
        if (error.includes('request timed out')) {
            state.timeouted.push({ url: request.url });
        } else {
            state.failedToLoadOther.push({ url: request.url });
        }
        // CheerioCrawler obscures status code >=500 to a string message so we have to parse it
        const maybeStatusCheerio = error.match(/CheerioCrawler: (\d\d\d) - Internal Server Error/);
        if (maybeStatusCheerio) {
            const statusCode = Number(maybeStatusCheerio[1]);
            if (!state.statusCodes[statusCode]) {
                state.statusCodes[statusCode] = [];
            }
            state.statusCodes[statusCode].push({ url: request.url });
        }
    }

    const basicOptions = {
        maxRequestRetries: 0,
        maxRequestsPerCrawl: maxPagesPerCrawl,
        maxConcurrency,
        requestQueue,
        handlePageFunction,
        handleFailedRequestFunction,
        proxyUrls: proxyUrl ? [proxyUrl] : null,
    };

    const launchPuppeteerOptions = {
        proxyUrl,
        stealth: true,
    };

    const crawler = type === 'cheerio'
        ? new Apify.CheerioCrawler({ ...basicOptions, proxyUrls: proxyUrl ? [proxyUrl] : null })
        : new Apify.PuppeteerCrawler({ ...basicOptions, launchPuppeteerOptions });

    await crawler.run();

    await Apify.setValue('OUTPUT', toSimpleState(state));
    await Apify.setValue('DETAILED-OUTPUT', state);
    console.log(`Simple output: https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/OUTPUT?disableRedirect=true`)
    console.log(`Detailed output: https://api.apify.com/v2/key-value-stores/${Apify.getEnv().defaultKeyValueStoreId}/records/DETAILED-OUTPUT?disableRedirect=true`)
});
