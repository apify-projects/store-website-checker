import { Actor } from 'apify';

import type { RequestQueue } from 'apify';
import type { PseudoUrlInput } from 'crawlee';

import { testHtml } from './checkers.js';

import type { CheerioActorInput, ActorCheckDetailedOutput, CheerioCheckerHandlePageInputs } from './typedefs.js';

export async function handlePage(
    input: CheerioActorInput,
    requestQueue: RequestQueue,
    state: ActorCheckDetailedOutput,
    { request, $, body, response, enqueueLinks }: CheerioCheckerHandlePageInputs,
) {
    /** @type {string | undefined} */
    let htmlUrl;

    if (input.saveSnapshot) {
        const key = `SNAPSHOT-${Math.random().toString()}`;
        await Actor.setValue(`${key}.html`, body, { contentType: 'text/html' });
        htmlUrl = `https://api.apify.com/v2/key-value-stores/${Actor.getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`;
    }

    state.totalPages.push({ url: request.url, htmlUrl });

    const { statusCode } = response;

    state.statusCodes[statusCode!] ??= [];
    state.statusCodes[statusCode!].push({ url: request.url, htmlUrl });

    const captchas: string[] = [];
    const testResult = testHtml($);

    for (const testResultEntry of Object.entries(testResult)) {
        const wasFound = testResultEntry[1];
        const testCase = testResultEntry[0] as 'accessDenied' | 'distilCaptcha' | 'recaptcha' | 'hCaptcha';
        if (wasFound) {
            captchas.push(testCase);

            state[testCase].push({ url: request.url, htmlUrl });
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

    if (input.linkSelector) {
        const info = await requestQueue.getInfo();

        // Only queue up more requests in the queue if we should (this should avoid excessive queue writes)
        if (input.maxNumberOfPagesCheckedPerDomain > info!.totalRequestCount) {
            await enqueueLinks({
                selector: input.linkSelector,
                pseudoUrls: input.pseudoUrls.map(
                    (req) => ({
                        purl: req.purl,
                        url: request.url,
                        headers: req.headers,
                        method: req.method,
                        payload: req.payload,
                        userData: req.userData,
                    }) as PseudoUrlInput,
                ),
                baseUrl: request.loadedUrl,
            });
        }
    }
}
