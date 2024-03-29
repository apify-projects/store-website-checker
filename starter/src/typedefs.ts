import { ActorRun } from "apify";

export interface FrontendActorState {
    totalUrls: number;
    runConfigurations: PreparedActorConfig[];
    checkerFinished: boolean;
}

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
    enqueueAllOnDomain?: boolean;
    linkSelector?: string;
    pseudoUrls: PseudoUrlInput[];
    repeatChecksOnProvidedUrls?: number;
    maxNumberOfPagesCheckedPerDomain: number;
    maxConcurrentPagesCheckedPerDomain: number;
    maxConcurrentDomainsChecked: number;
    retireBrowserInstanceAfterRequestCount: number;
    navigationTimeoutSecs: number;

    // Pass only to puppeteer
    'puppeteer.headfull'?: boolean;
    'puppeteer.useChrome'?: boolean;
    'puppeteer.waitFor'?: string;
    'puppeteer.memory'?: number;

    // Pass only to playwright
    'playwright.chrome'?: boolean;
    'playwright.firefox'?: boolean;
    'playwright.webkit'?: boolean;
    'playwright.headfull'?: boolean;
    'playwright.useChrome'?: boolean;
    'playwright.waitFor'?: string;
    'playwright.memory'?: number;
}

export interface PreparedActorConfig {
    actorId: string;
    proxyUsed?: string;
    url: string;
    input: ActorInputData;
    params: {
        memory: number;
        timeout: number;
    };
    // This data is set when the config is ran
    runId?: string;
}

export interface CreateActorRunConfig {
    checkerId: string;
    input: ActorInputData;
    urlData: UrlInput;
    playwrightBrowser?: 'chrome' | 'firefox' | 'webkit';
    memory?: number;
}

export interface UrlCheckResult {
    url: string;
    screenshotUrl?: string;
    htmlUrl?: string;
}

export interface ActorCheckDetailedOutput {
    // Set by waitForRunToFinishAndPushData
    proxyUsed?: string;
    checkerType: 'cheerio' | 'puppeteer' | 'playwright';
    playwrightBrowser?: 'chrome' | 'firefox' | 'webkit';
    computeUnitsUsedForThisCheck?: number;
    // (totalPages.length / computeUnitsUsedForThisCheck) yields the amount of pages checkable per compute unit
    pagesPerComputeUnit: number;
    computeUnitsPerRequest: number;
    residentialGBs: number;
    residentialGBsPerRequest: number;
    estimatedCost: number;
    estimatedCostPerRequest: number;


    // URLs
    url: string;
    simplifiedOutput: string;
    detailedOutput: string;
    runUrl: string;

    successRate?: number;

    // Page data
    totalPages: UrlCheckResult[];
    timedOut: UrlCheckResult[];
    failedToLoadOther: UrlCheckResult[];
    accessDenied: UrlCheckResult[];
    success: UrlCheckResult[];

    // Status codes
    statusCodes: Record<number, UrlCheckResult[]>;

    // Captcha time
    recaptcha: UrlCheckResult[];
    distilCaptcha: UrlCheckResult[];
    hCaptcha: UrlCheckResult[];
}

export type ActorCheckSimplifiedOutput = {
    [K in keyof ActorCheckDetailedOutput]:
        ActorCheckDetailedOutput[K] extends Array<any>
            ? number
            : ActorCheckDetailedOutput[K] extends { [key: number]: UrlCheckResult[] }
                ? Record<number, number>
                : ActorCheckDetailedOutput[K];
};

export interface FixedActorRun extends ActorRun {
    usage: {
        ACTOR_COMPUTE_UNITS: number,
        DATASET_READS: number,
        DATASET_WRITES: number,
        KEY_VALUE_STORE_READS: number,
        KEY_VALUE_STORE_WRITES: number,
        KEY_VALUE_STORE_LISTS: number,
        REQUEST_QUEUE_READS: number,
        REQUEST_QUEUE_WRITES: number,
        DATA_TRANSFER_INTERNAL_GBYTES: number,
        DATA_TRANSFER_EXTERNAL_GBYTES: number,
        PROXY_RESIDENTIAL_TRANSFER_GBYTES: number,
        PROXY_SERPS: number,
    }
};
