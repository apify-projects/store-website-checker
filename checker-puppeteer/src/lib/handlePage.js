import { getEnv, PseudoUrl, pushData, utils } from 'apify';
import Cheerio from 'cheerio';
import { testHtml } from './checkers.js';

/**
 * @param {import('../types').PuppeteerActorInput} input
 * @param {import('apify').RequestQueue} requestQueue
 * @param {import('../../../common/types').ActorCheckDetailedOutput} state
 * @param {Parameters<import('apify').PuppeteerHandlePage>[0]} param1
 */
export async function handlePage(input, requestQueue, state, { request, response, page }) {
    /** @type {string | undefined} */
    let htmlUrl;
    /** @type {string | undefined} */
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
        await utils.puppeteer.saveSnapshot(page, { key });
        screenshotUrl = `https://api.apify.com/v2/key-value-stores/${getEnv().defaultKeyValueStoreId}/records/${key}.jpg?disableRedirect=true`;
        htmlUrl = `https://api.apify.com/v2/key-value-stores/${getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`;
    }

    state.totalPages.push({ url: request.url, htmlUrl, screenshotUrl });

    // TODO: What's the type for response
    const statusCode = response.status();

    state.statusCodes[statusCode] ??= [];
    state.statusCodes[statusCode].push({ url: request.url, htmlUrl, screenshotUrl });

    const html = await page.content();
    const $ = Cheerio.load(html);

    /** @type {string[]} */
    const captchas = [];
    const testResult = testHtml($);

    for (const [testCase, wasFound] of Object.entries(testResult)) {
        if (wasFound) {
            captchas.push(testCase);

            /** @type {keyof ReturnType<typeof testHtml>} */
            // @ts-expect-error JS side casts
            const castedTestCaseInJS = testCase;

            state[castedTestCaseInJS].push({ url: request.url, htmlUrl });
        }
    }

    const wasSuccess = statusCode < 400 && captchas.length === 0;
    if (wasSuccess) {
        state.success.push({ url: request.url, htmlUrl, screenshotUrl });
    }

    await pushData({
        url: request.url,
        htmlUrl,
        screenshotUrl,
        statusCode,
        captchas,
        wasSuccess,
    });

    if (input.linkSelector) {
        await utils.enqueueLinks({
            $,
            selector: input.linkSelector,
            pseudoUrls: input.pseudoUrls.map(
                (req) => new PseudoUrl(req.purl, {
                    url: request.url,
                    headers: req.headers,
                    method: req.method,
                    payload: req.payload,
                    userData: req.userData,
                }),
            ),
            requestQueue,
            baseUrl: request.loadedUrl,
        });
    }
}
