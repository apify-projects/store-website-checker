import { ActorInputData } from '../../common/types';

type KeysNotRequired =
    | 'checkers.cheerio'
    | 'checkers.puppeteer'
    | 'checkers.playwright'
    | 'puppeteer.headfull'
    | 'puppeteer.useChrome'
    | 'puppeteer.waitFor'
    | 'maxConcurrentDomainsChecked';

export type PlaywrightActorInput = Omit<ActorInputData, KeysNotRequired>;
