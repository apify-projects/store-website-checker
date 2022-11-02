import { log } from 'crawlee';

import type { PlaywrightCrawlingContext } from 'crawlee';

import type { ActorCheckDetailedOutput } from './typedefs.js';

export async function handleFailedRequest(state: ActorCheckDetailedOutput, { request }: PlaywrightCrawlingContext) {
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
