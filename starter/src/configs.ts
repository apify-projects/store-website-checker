import { ACTOR_CHEERIO_CHECKER_NAME, ACTOR_PLAYWRIGHT_CHECKER_NAME, ACTOR_PUPPETEER_CHECKER_NAME } from './constants.js';
import type { PreparedActorConfig, ActorInputData, CreateActorRunConfig } from './typedefs.js';

export function convertInputToActorConfigs(input: ActorInputData): PreparedActorConfig[] {
    const configs: PreparedActorConfig[] = [];

    for (const urlData of input.urlsToCheck) {
        if (input['checkers.cheerio']) {
            configs.push(...createActorRunConfigForCrawler({ input, urlData, checkerId: ACTOR_CHEERIO_CHECKER_NAME }));
        }
        if (input['checkers.puppeteer']) {
            configs.push(...createActorRunConfigForCrawler({ input, urlData, checkerId: ACTOR_PUPPETEER_CHECKER_NAME, memory: input['puppeteer.memory'] }));
        }
        if (input['checkers.playwright']) {
            // Create a run config for each playwright browser
            if (input['playwright.chrome']) {
                configs.push(...createActorRunConfigForCrawler({
                    input,
                    urlData,
                    checkerId: ACTOR_PLAYWRIGHT_CHECKER_NAME,
                    playwrightBrowser: 'chrome',
                    memory: input['playwright.memory'],
                }));
            }
            if (input['playwright.firefox']) {
                configs.push(...createActorRunConfigForCrawler({
                    input,
                    urlData,
                    checkerId: ACTOR_PLAYWRIGHT_CHECKER_NAME,
                    playwrightBrowser: 'firefox',
                    memory: input['playwright.memory'],
                }));
            }
            if (input['playwright.webkit']) {
                configs.push(...createActorRunConfigForCrawler({
                    input,
                    urlData,
                    checkerId: ACTOR_PLAYWRIGHT_CHECKER_NAME,
                    playwrightBrowser: 'webkit',
                    memory: input['playwright.memory'],
                }));
            }
        }
    }

    return configs;
}

function* createActorRunConfigForCrawler({ input, urlData, checkerId, playwrightBrowser, memory }: CreateActorRunConfig) {
    const proxyGroups = input.proxyConfiguration.apifyProxyGroups?.length
        ? input.proxyConfiguration.apifyProxyGroups
        : ['auto'];  
    for (const group of proxyGroups) {
        const { url } = urlData;
        const config: PreparedActorConfig = {
            actorId: checkerId,
            proxyUsed: group === 'auto' ? undefined : group,
            url,
            input: {
                saveSnapshot: input.saveSnapshot,
                urlsToCheck: [urlData],
                proxyConfiguration: {
                    useApifyProxy: input.proxyConfiguration.useApifyProxy,
                    apifyProxyCountry: input.proxyConfiguration.apifyProxyCountry,
                    apifyProxyGroups: group === 'auto' ? undefined : [group],
                },
                linkSelector: input.enqueueAllOnDomain ? 'a[href]' : input.linkSelector,
                pseudoUrls: input.enqueueAllOnDomain
                    ? [{ purl: `${new URL(url).origin}[.*]` }]
                    : input.pseudoUrls,
                repeatChecksOnProvidedUrls: input.repeatChecksOnProvidedUrls,
                maxNumberOfPagesCheckedPerDomain: input.maxNumberOfPagesCheckedPerDomain,
                maxConcurrentPagesCheckedPerDomain: input.maxConcurrentPagesCheckedPerDomain,
                maxConcurrentDomainsChecked: input.maxConcurrentDomainsChecked,
                retireBrowserInstanceAfterRequestCount: input.retireBrowserInstanceAfterRequestCount,
                navigationTimeoutSecs: input.navigationTimeoutSecs,
            },
            params: {
                memory: memory || (checkerId === ACTOR_CHEERIO_CHECKER_NAME ? 4096 : 8192),
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

        yield config;
    }
}
