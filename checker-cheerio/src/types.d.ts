import { CheerioHandlePageInputs } from 'apify';
import { ActorInputData, Cheerio$ } from '../../common/types';

type KeysNotRequired =
    | 'checkers.cheerio'
    | 'checkers.puppeteer'
    | 'checkers.playwright'
    | 'puppeteer.headfull'
    | 'puppeteer.useChrome'
    | 'puppeteer.waitFor'
    | 'playwright.chrome'
    | 'playwright.firefox'
    | 'playwright.webkit'
    | 'maxConcurrentDomainsChecked';

export type CheerioActorInput = Omit<ActorInputData, KeysNotRequired>;

export interface CheerioCheckerHandlePageInputs extends CheerioHandlePageInputs {
    $: Cheerio$;
}
