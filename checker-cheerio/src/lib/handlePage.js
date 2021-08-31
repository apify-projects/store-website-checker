import { getEnv, PseudoUrl, pushData, setValue, utils } from 'apify';
import { testHtml } from './checkers';

/**
 * @param {import('../types').CheerioActorInput} input
 * @param {import('apify').RequestQueue} requestQueue
 * @param {import('../../../common/types').ActorCheckDetailedOutput} state
 * @param {import('../types').CheerioCheckerHandlePageInputs} param1
 */
export async function handlePage(input, requestQueue, state, { request, $, body, response }) {
    /** @type {string | undefined} */
    let htmlUrl;

    if (input.saveSnapshot) {
        const key = `SNAPSHOT-${Math.random().toString()}`;
        await setValue(`${key}.html`, body, { contentType: 'text/html' });
        htmlUrl = `https://api.apify.com/v2/key-value-stores/${getEnv().defaultKeyValueStoreId}/records/${key}.html?disableRedirect=true`;
    }

    /** @type {{ statusCode: number; }} */
    // @ts-expect-errorJS style casts
    const { statusCode } = response;

    state.statusCodes[statusCode] ??= [];
    state.statusCodes[statusCode].push({ url: request.url, htmlUrl });

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
        state.success.push({ url: request.url, htmlUrl });
    }

    await pushData({
        url: request.url,
        htmlUrl,
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
                    ...req,
                }),
            ),
            requestQueue,
            baseUrl: request.loadedUrl,
        });
    }
}
