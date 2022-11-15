import { Actor } from 'apify';
import { log, CheerioCrawler } from 'crawlee';
import type { RequestOptions } from 'crawlee';

import { inspect } from 'util';
import { handleFailedRequest } from './handleFailedRequest.js';
import { handlePage } from './handlePage.js';
import { convertDetailedOutputToSimplified } from './utils.js';
import type { CheerioActorInput, ActorCheckDetailedOutput } from './typedefs.js';

Actor.main(async () => {
    const input = await Actor.getInput() as CheerioActorInput;

    // Log the input
    // Log the input
    log.info('Input provided:');
    log.debug(inspect(input, false, 4));

    log.info(
        [
            'Running a Cheerio Checker. Cheerio downloads only initial HTML.',
            'If you need to render JavaScript or wait on a page for data to load, enable Puppeteer or Playwright as Checker Type in the Frontend.',
        ].join('\n'),
    );

    const {
        maxConcurrentPagesCheckedPerDomain,
        maxNumberOfPagesCheckedPerDomain,
        proxyConfiguration,
        urlsToCheck,
        repeatChecksOnProvidedUrls,
        navigationTimeoutSecs,
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
            ...urlData as RequestOptions,
            uniqueKey: Math.random().toString(),
        });
    }

    const env = Actor.getEnv();

    const state: ActorCheckDetailedOutput = {
        url: urlData.url,
        checkerType: 'cheerio',
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

    const crawler = new CheerioCrawler({
        maxRequestRetries: 0,
        navigationTimeoutSecs,
        maxRequestsPerCrawl: maxNumberOfPagesCheckedPerDomain,
        maxConcurrency: maxConcurrentPagesCheckedPerDomain,
        requestQueue,
        requestHandler: (pageInputs) => handlePage(input, requestQueue, state, pageInputs),
        failedRequestHandler: (requestInput) => handleFailedRequest(state, requestInput),
        proxyConfiguration: proxy,
        useSessionPool: false,
        additionalMimeTypes: ['application/xml'],
    });

    // TODO: Consider making this an option in the CheerioCrawler instead of needing to override a function
    // We don't want the crawler to throw errors on bad statuses
    Reflect.set(crawler, '_throwOnBlockedRequest', () => {
        // Do nothing
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
