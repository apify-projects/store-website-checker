import { ActorInputData } from '../../common/types';

type KeysNotRequired =
    | 'checkers.cheerio'
    | 'checkers.puppeteer'
    | 'checkers.playwright'
    | 'playwright.chrome'
    | 'playwright.firefox'
    | 'playwright.webkit'
    | 'maxConcurrentDomainsChecked';

export type PuppeteerActorInput = Omit<ActorInputData, KeysNotRequired>;
