import Apify from 'apify';
import { chromium, firefox, webkit } from 'playwright';
import { inspect } from 'util';
import { handleFailedRequest } from './lib/handleFailedRequest.js';
import { handlePage } from './lib/handlePage.js';
import { convertDetailedOutputToSimplified } from './lib/utils.js';

const { log } = Apify.utils;
const env = Apify.getEnv();

Apify.main(async () => {
    /** @type {import('./types').PlaywrightActorInput} */
    // @ts-expect-error It's not null
    const input = await Apify.getInput();

    // Log the input
    // Log the input
    log.info('Input provided:');
    log.debug(inspect(input, false, 4));

    log.info('Running a Playwright Checker.');

    const {
        maxConcurrentPagesCheckedPerDomain,
        maxNumberOfPagesCheckedPerDomain,
        proxyConfiguration,
        urlsToCheck,
        repeatChecksOnProvidedUrls,
        retireBrowserInstanceAfterRequestCount,
        'playwright.useChrome': useChrome,
        'playwright.headfull': headfull,
        'playwright.chrome': playwrightChromeLauncher,
        'playwright.firefox': playwrightFirefoxLauncher,
        'playwright.webkit': playwrightWebkitLauncher,
    } = input;

    let launcher;

    if (playwrightChromeLauncher) {
        launcher = chromium;
    } else if (playwrightFirefoxLauncher) {
        launcher = firefox;
    } else if (playwrightWebkitLauncher) {
        launcher = webkit;
    }

    const proxy = await Apify.createProxyConfiguration({
        groups: proxyConfiguration.apifyProxyGroups,
        countryCode: proxyConfiguration.apifyProxyCountry,
    });

    const requestQueue = await Apify.openRequestQueue();

    const [urlData] = urlsToCheck;
    await requestQueue.addRequest({ ...urlData });
    for (let _ = 0; _ < (repeatChecksOnProvidedUrls ?? 0); _++) {
        await requestQueue.addRequest({
            ...urlData,
            uniqueKey: Math.random().toString(),
        });
    }

    /** @type {import('../../common/types').ActorCheckDetailedOutput} */
    const state = {
        url: urlData.url,
        checkerType: 'playwright',
        simplifiedOutput: `https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/OUTPUT?disableRedirect=true`,
        detailedOutput: `https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/DETAILED-OUTPUT?disableRedirect=true`,
        totalPages: [],
        timedOut: [],
        failedToLoadOther: [],
        accessDenied: [],
        success: [],
        statusCodes: {},
        recaptcha: [],
        distilCaptcha: [],
        hCaptcha: [],
    };

    const crawler = new Apify.PlaywrightCrawler({
        maxRequestRetries: 0,
        maxRequestsPerCrawl: maxNumberOfPagesCheckedPerDomain,
        maxConcurrency: maxConcurrentPagesCheckedPerDomain,
        requestQueue,
        handlePageFunction: (pageInputs) => handlePage(input, requestQueue, state, pageInputs),
        handleFailedRequestFunction: (requestInput) => handleFailedRequest(state, requestInput),
        proxyConfiguration: proxy,
        useSessionPool: false,
        launchContext: {
            useChrome,
            launchOptions: {
                headless: headfull ? undefined : true,
            },
            launcher,
        },
        // @ts-expect-error Might need to correct the typings for this somewhere (probably in apify)
        browserPoolOptions: {
            retireBrowserAfterPageCount: retireBrowserInstanceAfterRequestCount,
        },
    });

    await crawler.run();

    await Apify.setValue('OUTPUT', convertDetailedOutputToSimplified(state));
    await Apify.setValue('DETAILED-OUTPUT', state);
    log.info('Checker finished.');
    log.info(
        `Simplified output: https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/OUTPUT?disableRedirect=true`,
    );
    log.info(
        `Detailed output: https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/DETAILED-OUTPUT?disableRedirect=true`,
    );
    log.info(`Preview dataset: https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=html`);
});
