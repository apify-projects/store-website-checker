// TODO: use the production ID
export const ACTOR_CHEERIO_CHECKER_NAME = 'vladfrangu/website-checker-cheerio-alpha';

export const ACTOR_PUPPETEER_CHECKER_NAME = 'vladfrangu/website-checker-puppeteer-alpha';

export const ACTOR_PLAYWRIGHT_CHECKER_NAME = 'vladfrangu/website-checker-playwright-alpha';

/** @param {string} id */
export function actorIdToCheckerType(id) {
    switch (id) {
        case ACTOR_CHEERIO_CHECKER_NAME: return 'cheerio';
        case ACTOR_PUPPETEER_CHECKER_NAME: return 'puppeteer';
        case ACTOR_PLAYWRIGHT_CHECKER_NAME: return 'playwright';
        default: throw new Error(`Unhandled case for ${id}`);
    }
}
