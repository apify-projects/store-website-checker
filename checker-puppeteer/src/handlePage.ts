import { Actor } from 'apify';
import Cheerio from 'cheerio';
import { testHtml } from './checkers.js';
import { puppeteerUtils, PseudoUrl } from 'crawlee';

import type { RequestQueue } from 'apify';
import type { PuppeteerCrawlingContext, RequestOptions } from 'crawlee';

import type { ActorCheckDetailedOutput, PuppeteerActorInput } from './typedefs.js';

export async function handlePage(
    input: PuppeteerActorInput,
    requestQueue: RequestQueue,
    state: ActorCheckDetailedOutput,
    { request, response, page, crawler }: PuppeteerCrawlingContext
): Promise<void> {
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
        screenshotUrl = `https://api.apify.com/v2/key-value-stores/${Actor.getEnv().defaultKeyValueStoreId}/records/${key}.jpg?disableRedirect=true`;
        htmlUrl = `https://api.apify.com/v2/key-value-stores/${Actor.getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`;
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
