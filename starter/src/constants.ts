export const ACTOR_CHEERIO_CHECKER_NAME = 'lukaskrivka/website-checker-cheerio';

export const ACTOR_PUPPETEER_CHECKER_NAME = 'lukaskrivka/website-checker-puppeteer';

export const ACTOR_PLAYWRIGHT_CHECKER_NAME = 'lukaskrivka/website-checker-playwright';

export const DEFAULT_COSTS = {
    COMPUTE_UNIT: 0.25,
    RESIDENTIAL_GB: 12.5,
}

export const TABLE_FIELDS_ORDER = [
    'url',
    'checkerType',
    'proxyUsed',
    'totalPages',
    'success',
    'successRate',
    'estimatedCostPerRequest',
    'computeUnitsPerRequest',
    'residentialGBsPerRequest',
    'runUrl'
]
