import { ACTOR_CHEERIO_CHECKER_NAME, ACTOR_PLAYWRIGHT_CHECKER_NAME, ACTOR_PUPPETEER_CHECKER_NAME } from './constants';

/** @param {import('../../../common/types').ActorInputData} input */
export function convertInputToActorConfigs(input) {
    /** @type {import('../../../common/types').PreparedActorConfig[][]} */
    const configs = [];

    for (const urlData of input.urlsToCheck) {
        /** @type {import('../../../common/types').PreparedActorConfig[]} */
        const urlConfigs = [];
        if (input['checkers.cheerio']) createActorRunConfigForCrawler(urlConfigs, input, urlData, ACTOR_CHEERIO_CHECKER_NAME);
        if (input['checkers.puppeteer']) createActorRunConfigForCrawler(urlConfigs, input, urlData, ACTOR_PUPPETEER_CHECKER_NAME);
        if (input['checkers.playwright']) createActorRunConfigForCrawler(urlConfigs, input, urlData, ACTOR_PLAYWRIGHT_CHECKER_NAME);

        configs.push(urlConfigs);
    }

    return configs;
}

/**
 * @param {import('../../../common/types').PreparedActorConfig[]} configs
 * @param {import('../../../common/types').ActorInputData} input
 * @param {import('../../../common/types').UrlInput} urlData,
 * @param {string} checkerId
 */
function createActorRunConfigForCrawler(configs, input, urlData, checkerId) {
    for (const group of input.proxyConfiguration.apifyProxyGroups ?? ['auto']) {
        /** @type {import('../../../common/types').PreparedActorConfig} */
        const config = {
            actorId: checkerId,
            proxyUsed: group === 'auto' ? undefined : group,
            url: urlData.url,
            input: {
                saveSnapshot: input.saveSnapshot,
                urlsToCheck: [urlData],
                proxyConfiguration: {
                    useApifyProxy: input.proxyConfiguration.useApifyProxy,
                    apifyProxyCountry: input.proxyConfiguration.apifyProxyCountry,
                    apifyProxyGroups: group === 'auto' ? undefined : [group],
                },
                linkSelector: input.linkSelector,
                pseudoUrls: input.pseudoUrls,
                repeatChecksOnProvidedUrls: input.repeatChecksOnProvidedUrls,
                maxNumberOfPagesCheckedPerDomain: input.maxNumberOfPagesCheckedPerDomain,
                maxConcurrentPagesCheckedPerDomain: input.maxConcurrentPagesCheckedPerDomain,
                maxConcurrentDomainsChecked: input.maxConcurrentDomainsChecked,
                retireBrowserInstanceAfterRequestCount: input.retireBrowserInstanceAfterRequestCount,
            },
            params: {
                memoryMbytes: checkerId === ACTOR_CHEERIO_CHECKER_NAME ? 4096 : 8192,
                timeout: 24 * 3600,
            },
        };

        if (checkerId === ACTOR_PUPPETEER_CHECKER_NAME) {
            config.input['puppeteer.headfull'] = input['puppeteer.headfull'];
            config.input['puppeteer.useChrome'] = input['puppeteer.useChrome'];
            config.input['puppeteer.waitFor'] = input['puppeteer.waitFor'];
        } else if (checkerId === ACTOR_PLAYWRIGHT_CHECKER_NAME) {
            config.input['playwright.chrome'] = input['playwright.chrome'];
            config.input['playwright.firefox'] = input['playwright.firefox'];
            config.input['playwright.webkit'] = input['playwright.webkit'];
        }

        configs.push(config);
    }
}
