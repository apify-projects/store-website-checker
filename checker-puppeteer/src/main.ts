import { Actor } from 'apify';
import { log, PuppeteerCrawler, RequestOptions } from 'crawlee';

import type { ActorCheckDetailedOutput, PuppeteerActorInput } from './typedefs';

import { inspect } from 'util';
import { handleFailedRequest } from './handleFailedRequest.js';
import { handlePage } from './handlePage.js';
import { convertDetailedOutputToSimplified } from './utils.js';

Actor.main(async () => {
    const input = await Actor.getInput() as PuppeteerActorInput;

    // Log the input
    // Log the input
    log.info('Input provided:');
    log.debug(inspect(input, false, 4));

    log.info('Running a Puppeteer Checker.');

    const env = Actor.getEnv();

    const {
        maxConcurrentPagesCheckedPerDomain,
        maxNumberOfPagesCheckedPerDomain,
        proxyConfiguration,
        urlsToCheck,
        repeatChecksOnProvidedUrls,
        retireBrowserInstanceAfterRequestCount,
        'puppeteer.useChrome': useChrome,
        'puppeteer.headfull': headfull,
    } = input;

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
        checkerType: 'puppeteer',
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

    const crawler = new PuppeteerCrawler({
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
