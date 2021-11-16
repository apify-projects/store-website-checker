import Apify from 'apify';

const { utils } = Apify;
const { log } = utils;

/**
 * @param {import('../../../common/types').ActorCheckDetailedOutput} state
 * @param {import('apify').HandleFailedRequestInput} param1
 */
export async function handleFailedRequest(state, { request }) {
    state.totalPages.push({ url: request.url });

    const [error] = request.errorMessages;
    log.warning(`Request failed --- ${request.url}\n${error}`);

    if (error.includes('request timed out')) {
        state.timedOut.push({ url: request.url });
    } else {
        state.failedToLoadOther.push({ url: request.url });
    }

    // CheerioCrawler obscures status code >=500 to a string message so we have to parse it
    const maybeStatusCheerio = error.match(/(\d\d\d) - Internal Server Error/);
    if (maybeStatusCheerio) {
        const statusCode = Number(maybeStatusCheerio[1]);
        state.statusCodes[statusCode] ??= [];
        state.statusCodes[statusCode].push({ url: request.url });
    }
}
