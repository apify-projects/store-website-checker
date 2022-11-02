import { Actor } from 'apify';
import { log, PlaywrightCrawler, RequestOptions } from 'crawlee';
import { chromium, firefox, webkit } from 'playwright';
import { inspect } from 'util';

import type { ActorCheckDetailedOutput, PlaywrightActorInput } from './typedefs';

import { handleFailedRequest } from './handleFailedRequest.js';
import { handlePage } from './handlePage.js';
import { convertDetailedOutputToSimplified } from './utils.js';

const env = Actor.getEnv();

Actor.main(async () => {
    const input = await Actor.getInput() as PlaywrightActorInput;

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

    const proxy = await Actor.createProxyConfiguration({
        groups: proxyConfiguration.apifyProxyGroups,
        countryCode: proxyConfiguration.apifyProxyCountry,
    });

    const requestQueue = await Actor.openRequestQueue();

    const [urlData] = urlsToCheck;
    await requestQueue.addRequest(urlData as RequestOptions);
    for (let _ = 0; _ < (repeatChecksOnProvidedUrls ?? 0); _++) {
        await requestQueue.addRequest({
            ...urlData,
            uniqueKey: Math.random().toString(),
        } as RequestOptions);
    }

    const state: ActorCheckDetailedOutput = {
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

    const crawler = new PlaywrightCrawler({
        maxRequestRetries: 0,
        maxRequestsPerCrawl: maxNumberOfPagesCheckedPerDomain,
        maxConcurrency: maxConcurrentPagesCheckedPerDomain,
        requestQueue,
        requestHandler: (pageInputs) => handlePage(input, requestQueue, state, pageInputs),
        failedRequestHandler: (requestInput) => handleFailedRequest(state, requestInput),
        proxyConfiguration: proxy,
        useSessionPool: false,
        launchContext: {
            useChrome,
            launchOptions: {
                headless: headfull ? undefined : true,
            },
            launcher,
        },
        browserPoolOptions: {
            retireBrowserAfterPageCount: retireBrowserInstanceAfterRequestCount,
        },
    });

    await crawler.run();

    await Actor.setValue('OUTPUT', convertDetailedOutputToSimplified(state));
    await Actor.setValue('DETAILED-OUTPUT', state);
    log.info('Checker finished.');
    log.info(
        `Simplified output: https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/OUTPUT?disableRedirect=true`,
    );
    log.info(
        `Detailed output: https://api.apify.com/v2/key-value-stores/${env.defaultKeyValueStoreId}/records/DETAILED-OUTPUT?disableRedirect=true`,
    );
    log.info(`Preview dataset: https://api.apify.com/v2/datasets/${env.defaultDatasetId}/items?clean=true&format=html`);
});
