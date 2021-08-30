/* eslint-disable @typescript-eslint/no-unused-vars */
import cheerio from 'cheerio';

export type Cheerio$ = cheerio.Root;

export interface PseudoUrlInput {
    purl: string;
    method?: string;
    payload?: string;
    userData?: Record<string, unknown>;
    headers?: Record<string, string>;
}

export interface UrlInput {
    url: string;
    method?: string;
    payload?: string;
    userData?: Record<string, unknown>;
    headers?: Record<string, string>;
}

export interface ProxyConfiguration {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
    apifyProxyCountry?: string;
}

export interface ActorInputData {
    // Crawlers to use
    'checkers.cheerio'?: boolean;
    'checkers.puppeteer'?: boolean;
    'checkers.playwright'?: boolean;

    // Pass these to crawlers

    // save snapshots
    saveSnapshot?: boolean;

    // General options
    urlsToCheck: UrlInput[];
    proxyConfiguration: ProxyConfiguration;
    linkSelector?: string;
    pseudoUrls: PseudoUrlInput[];
    repeatChecksOnProvidedUrls?: number;
    maxNumberOfPagesCheckedPerDomain: number;
    maxConcurrentPagesCheckedPerDomain: number;
    maxConcurrentDomainsChecked: number;
    retireBrowserInstanceAfterRequestCount: number;

    // Pass only to puppeteer
    'puppeteer.headfull'?: boolean;
    'puppeteer.useChrome'?: boolean;
    'puppeteer.waitFor'?: boolean;

    // Pass only to playwright
    'playwright.chrome'?: boolean;
    'playwright.firefox'?: boolean;
    'playwright.webkit'?: boolean;
}

export interface PreparedActorConfig {
    actorId: string;
    proxyUsed?: string;
    url: string;
    input: ActorInputData;
    params: {
        memoryMbytes: number;
        timeout: number;
    };
    // This data is set when the config is ran
    runId?: string;
}

// --- OUTPUT ---

export interface ActorCheckDetailedOutput {
    // Set by waitForRunToFinishAndPushData
    proxyUsed?: string;
    checkerType: 'cheerio' | 'puppeteer' | 'playwright';
    computeUnitsUsedForThisCheck: number;
    // (totalPages.length / computeUnitsUsedForThisCheck) yields the amount of pages checkable per compute unit
    pagesPerComputeUnit: number;

    // URLs
    url: string;
    simplifiedOutput: string;
    detailedOutput: string;

    // Page data
    totalPages: UrlCheckResult[];
    timedOut: UrlCheckResult[];
    failedToLoadOther: UrlCheckResult[];
    accessDenied: UrlCheckResult[];
    successfulAccess: UrlCheckResult[];

    // Status codes
    statusCodes: Record<number, UrlCheckResult[]>;

    // Captcha time
    recaptcha: UrlCheckResult[];
    distilCaptcha: UrlCheckResult[];
    hCaptcha: UrlCheckResult[];
}

export interface UrlCheckResult {
    url: string;
    screenshotUrl?: string;
    htmlUrl?: string;
}

export type ActorCheckSimplifiedOutput = {
    [K in keyof ActorCheckDetailedOutput]:
        ActorCheckDetailedOutput[K] extends Array<infer _U>
            ? number
            : ActorCheckDetailedOutput[K] extends { [key: number]: UrlCheckResult[] }
                ? Record<number, number>
                : ActorCheckDetailedOutput[K];
};
