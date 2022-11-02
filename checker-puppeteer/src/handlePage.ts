import { Actor } from 'apify';
import Cheerio from 'cheerio';
import { testHtml } from './checkers.js';
import { puppeteerUtils } from 'crawlee';

import type { RequestQueue } from 'apify';
import type { PuppeteerCrawlingContext, PseudoUrlInput } from 'crawlee';

import type { ActorCheckDetailedOutput, PuppeteerActorInput } from './typedefs.js';

export async function handlePage(
    input: PuppeteerActorInput,
    requestQueue: RequestQueue,
    state: ActorCheckDetailedOutput,
    { request, response, page, enqueueLinks }: PuppeteerCrawlingContext
) {
    let htmlUrl;
    let screenshotUrl;

    const waitFor = input['puppeteer.waitFor'];

    if (waitFor) {
        // We wait for number in ms or a selector
        const maybeNumber = Number(waitFor);
        if (maybeNumber || maybeNumber === 0) {
            await page.waitForTimeout(maybeNumber);
        } else {
            await page.waitForSelector(waitFor);
        }
    }

    if (input.saveSnapshot) {
        const key = `SNAPSHOT-${Math.random().toString()}`;
        await puppeteerUtils.saveSnapshot(page, { key });
        screenshotUrl = `https://api.apify.com/v2/key-value-stores/${getEnv().defaultKeyValueStoreId}/records/${key}.jpg?disableRedirect=true`;
        htmlUrl = `https://api.apify.com/v2/key-value-stores/${getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`;
    }

    state.totalPages.push({ url: request.url, htmlUrl, screenshotUrl });

    const statusCode = response!.status();

    state.statusCodes[statusCode] ??= [];
    state.statusCodes[statusCode].push({ url: request.url, htmlUrl, screenshotUrl });

    const html = await page.content();
    const $ = Cheerio.load(html);

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

    const wasSuccess = statusCode < 400 && captchas.length === 0;
    if (wasSuccess) {
        state.success.push({ url: request.url, htmlUrl, screenshotUrl });
    }

    await Actor.pushData({
        url: request.url,
        htmlUrl,
        screenshotUrl,
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
                requestQueue,
                baseUrl: request.loadedUrl,
            });
        }
    }
}
