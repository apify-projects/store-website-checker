const Apify = require('apify');
const cheerio = require('cheerio');

const { testHtml } = require('./checkers.js');

Apify.main(async () => {
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);

    const {
        startUrls,
        pseudoUrls = [],
        linkSelector,
        maxConcurrency,
        maxRequestsPerCrawl,
        saveSnapshots = false,
        type = 'cheerio',
        proxyConfiguration = { useApifyProxy: true },
        replicateUrls = 0,
    } = input;

    const proxyUrl = proxyConfiguration.useApifyProxy
        ? Apify.getApifyProxyUrl({ groups: proxyConfiguration.apifyProxyGroups, country: proxyConfiguration.apifyProxyCountry})
        : null;

    const defaultState = {
        total: 0,
        timeouted: 0,
        failedToLoadOther: 0,
        accessDenied: 0,
        recaptcha: 0,
        distilCaptcha: 0,
        statusCodes: {},
    };

    const state = (await Apify.getValue('STATE')) || defaultState;
    Apify.events.on('migrating', async () => {
        await Apify.setValue('STATE', state);
    });

    setInterval(() => {
        console.dir(state)
    }, 10000);

    const requestQueue = await Apify.openRequestQueue();

    for (const req of startUrls) {
        await requestQueue.addRequest({ ...req, headers: {'User-Agent': Apify.utils.getRandomUserAgent() } });
        for (let i = 0; i < replicateUrls; i++) {
            await requestQueue.addRequest({ ...req, uniqueKey: Math.random().toString(), headers: {'User-Agent': Apify.utils.getRandomUserAgent() } });
        }
    }

    const handlePageFunction = async ({ request, $, html, page, response }) => {
        state.total++;

        let statusCode;
        // means Cheerio
        if ($) {
            statusCode = response.statusCode;
        } else {
            statusCode = response.status();
        }

        if (!state.statusCodes[statusCode]) {
            state.statusCodes[statusCode] = 0;
        }
        state.statusCodes[statusCode]++;

        if (!$) {
            html = await page.content();
            $ = cheerio.load(html);
        }
        const testResult = testHtml($);
        for (const [testCase, wasFound] of Object.entries(testResult)) {
            if (wasFound) {
                state[testCase]++;
            }
        }

        if (linkSelector) {
            await Apify.utils.enqueueLinks({
                $,
                selector: linkSelector,
                pseudoUrls: pseudoUrls.map((req) => new Apify.PseudoUrl(req.url)),
                requestQueue,
                baseUrl: request.loadedUrl,
                transformRequestFunction: (request) => {
                    request.headers = { ...request.headers, 'User-Agent': Apify.utils.getRandomUserAgent() }
                    return request;
                }
            });
        }


        if (saveSnapshots) {
            const key = `SNAPSHOT-${Math.random().toString()}`;
            if (page) {
                await Apify.utils.puppeteer.saveSnapshot(page, { key });
            } else {
                await Apify.setValue(key, html, { contentType: 'text/html' });
            }
        }
    }

    const handleFailedRequestFunction = ({ request }) => {
        state.total++;
        const error = request.errorMessages[0]
        console.log(`Request failed --- ${request.url}\n${error}`)
        if (error.includes('request timed out')) {
            state.timeouted++;
        } else {
            state.failedToLoadOther++;
        }
        // CheerioCrawler obscures status code >=500 to a tring message so we have to parse it
        const maybeStatusCheerio = error.match(/CheerioCrawler: (\d\d\d) - Internal Server Error/);
        if (maybeStatusCheerio) {
            const statusCode = Number(maybeStatusCheerio[1]);
            if (!state.statusCodes[statusCode]) {
                state.statusCodes[statusCode] = 0;
            }
            state.statusCodes[statusCode]++;
        }
    }

    const basicOptions = {
        maxRequestRetries: 0,
        maxRequestsPerCrawl,
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

    await Apify.setValue('OUTPUT', state);
});
