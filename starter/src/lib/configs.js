import { ACTOR_CHEERIO_CHECKER_NAME, ACTOR_PLAYWRIGHT_CHECKER_NAME, ACTOR_PUPPETEER_CHECKER_NAME } from './constants.js';

/** @param {import('../../../common/types').ActorInputData} input */
export function convertInputToActorConfigs(input) {
    /** @type {import('../../../common/types').PreparedActorConfig[][]} */
    const configs = [];

    for (const urlData of input.urlsToCheck) {
        /** @type {import('../../../common/types').PreparedActorConfig[]} */
        const urlConfigs = [];
        if (input['checkers.cheerio']) {
            urlConfigs.push(...createActorRunConfigForCrawler({ input, urlData, checkerId: ACTOR_CHEERIO_CHECKER_NAME }));
        }
        if (input['checkers.puppeteer']) {
            urlConfigs.push(...createActorRunConfigForCrawler({ input, urlData, checkerId: ACTOR_PUPPETEER_CHECKER_NAME }));
        }
        if (input['checkers.playwright']) {
            // Create a run config for each playwright browser
            if (input['playwright.chrome']) {
                urlConfigs.push(...createActorRunConfigForCrawler({
                    input,
                    urlData,
                    checkerId: ACTOR_PLAYWRIGHT_CHECKER_NAME,
                    playwrightBrowser: 'chrome',
                }));
            }
            if (input['playwright.firefox']) {
                urlConfigs.push(...createActorRunConfigForCrawler({
                    input,
                    urlData,
                    checkerId: ACTOR_PLAYWRIGHT_CHECKER_NAME,
                    playwrightBrowser: 'firefox',
                }));
            }
            if (input['playwright.webkit']) {
                urlConfigs.push(...createActorRunConfigForCrawler({
                    input,
                    urlData,
                    checkerId: ACTOR_PLAYWRIGHT_CHECKER_NAME,
                    playwrightBrowser: 'webkit',
                }));
            }
        }

        configs.push(urlConfigs);
    }

    return configs;
}

/**
 * @param {import('../../../common/types').CreateActorRunConfig} args_0
 */
function* createActorRunConfigForCrawler({ input, urlData, checkerId, playwrightBrowser }) {
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
                memory: checkerId === ACTOR_CHEERIO_CHECKER_NAME ? 4096 : 8192,
                timeout: 24 * 3600,
            },
        };

        if (checkerId === ACTOR_PUPPETEER_CHECKER_NAME) {
            config.input['puppeteer.headfull'] = input['puppeteer.headfull'];
            config.input['puppeteer.useChrome'] = input['puppeteer.useChrome'];
            config.input['puppeteer.waitFor'] = input['puppeteer.waitFor'];
        } else if (checkerId === ACTOR_PLAYWRIGHT_CHECKER_NAME && playwrightBrowser) {
            config.input[`playwright.${playwrightBrowser}`] = input[`playwright.${playwrightBrowser}`];
            config.input['playwright.headfull'] = input[`playwright.headfull`];
            config.input['playwright.useChrome'] = input['playwright.useChrome'];
            config.input['playwright.waitFor'] = input['playwright.waitFor'];
        }

        yield (config);
    }
}
