import { Actor } from 'apify';

import type { RequestQueue } from 'apify';
import { PseudoUrl, RequestOptions } from 'crawlee';

import { testHtml } from './checkers.js';

import type { CheerioActorInput, ActorCheckDetailedOutput, CheerioCheckerHandlePageInputs } from './typedefs.js';

export async function handlePage(
    input: CheerioActorInput,
    requestQueue: RequestQueue,
    state: ActorCheckDetailedOutput,
    { request, $, body, response, crawler, json }: CheerioCheckerHandlePageInputs,
) {
    /** @type {string | undefined} */
    let htmlUrl;

    if (input.saveSnapshot) {
        const key = `SNAPSHOT-${Math.random().toString()}`;
        if (json) {
            await Actor.setValue(key, json);
        } else {
            await Actor.setValue(`${key}.html`, body, { contentType: 'text/html' });
        }
        htmlUrl = `https://api.apify.com/v2/key-value-stores/${Actor.getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`;
    }

    state.totalPages.push({ url: request.url, htmlUrl });

    const { statusCode } = response;

    state.statusCodes[statusCode!] ??= [];
    state.statusCodes[statusCode!].push({ url: request.url, htmlUrl });

    const captchas: string[] = [];
    // We don't have $ for JSON responses nor we can recognize captchas from it
    if ($) {
        const testResult = testHtml($);

        for (const testResultEntry of Object.entries(testResult)) {
            const wasFound = testResultEntry[1];
            const testCase = testResultEntry[0] as 'accessDenied' | 'distilCaptcha' | 'recaptcha' | 'hCaptcha';
            if (wasFound) {
                captchas.push(testCase);

                state[testCase].push({ url: request.url, htmlUrl });
            }
        }
    }

    const wasSuccess = statusCode! < 400 && captchas.length === 0;
    if (wasSuccess) {
        state.success.push({ url: request.url, htmlUrl });
    }

    await Actor.pushData({
        url: request.url,
        htmlUrl,
        statusCode,
        captchas,
        wasSuccess,
    });

    const pageOrigin = new URL(request.url).origin;

    if (input.linkSelector && !!$) {
        const info = await requestQueue.getInfo();

        const maxUrlsToEnqueue = input.maxNumberOfPagesCheckedPerDomain - info!.totalRequestCount;
        if (maxUrlsToEnqueue > 0) {
            const toEnqueue: RequestOptions[] = [];
            $(input.linkSelector).each((_, el) => {
                const rawHref = $(el).attr('href');
                if (!rawHref) {
                    return;
                }
                const href = new URL(rawHref, pageOrigin).toString();
                for (const pseudoUrlInput of input.pseudoUrls) {
                    if (href && new PseudoUrl(pseudoUrlInput.purl).matches(href)) {
                        const newUrl = new URL(href, request.loadedUrl).toString();
                        toEnqueue.push({
                            url: newUrl,
                            headers: pseudoUrlInput.headers,
                            method: pseudoUrlInput.method as 'GET' | 'POST',
                            payload: pseudoUrlInput.payload,
                            userData: pseudoUrlInput.userData,
                        });
                    }
                }
            });
            console.log(`Found ${toEnqueue.length} links to enqueue on ${request.url}.`);
            await crawler.addRequests(toEnqueue.slice(0, maxUrlsToEnqueue));
        }
    }
}
