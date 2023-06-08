## Website Checker

Website checker is a simple actor that allows you to scan any website for performance and blocking using various scraping methods as Cheerio, Puppeteer and Playwright.

### Features

The actor provides these useful features out of the box:

- Collects response status codes
- Recognizes the most common captchas
- Saves HTML snapshots and screenshots (if Puppeteer or Playwright is chosen)
- Enables choosing between Cheerio (plain HTTP) and Puppeteer/Playwright (browser) scraper
- Enables choosing different browsers for Playwright - Chrome, Firefox and Webkit (Safari)
- Enables re-scraping start URLs or enqueueing with a familiar link selector + pseudo URLs system
- Handles different failure states like timeouts and network errors
- Enables basic proxy and browser configuration

### How to use

The most common use-case is to do a quick check on how aggressively the target site is blocking. In that case just supply a start URL, ideally a category one or product one. You can either set `replicateStartUrls` or add enqueueing with `linkSelector` + `pseudoUrls`, both are good options to test different proxies.

You can pick any combination of run options and the checker will spawn runner actor for every combination of scraping tool & proxies and then combine the results into single output.

In the end you will get a simple statistics about the blocking rate. It is recommended to check a few screenshots just to make sure the actor correctly recognized the page status. You can get to the detailed output (per URL) via KV store or dataset (the KV output sorts by response status while dataset is simply ordered by scraping order).

#### Multiple URLs and configurations
Website checker doesn't have any limitation of how many websites and configs you can check. For each website, it will run each config. You just need to set a reasonable `maxConcurrentDomainsChecked` so that all parallel runs fit into your total memory (4 GB for Cheerio and 8 GB for Puppeteer/Playwright checks).

### Input

Please follow the [actor's input page](https://apify.com/lukaskrivka/website-checker/input-schema) for a detailed explanation. Most input fields have reasonable defaults.

### Example output

#### Simple output

```
{
    "timeouted": 0,
    "failedToLoadOther": 9,
    "accessDenied": 0,
    "recaptcha": 0,
    "distilCaptcha": 24,
    "hCaptcha": 0, 
    "statusCodes": {
        "200": 3,
        "401": 2,
        "403": 5,
        "405": 24
    },
    "success": 3,
    "total": 43
}
```

### Changelog

Check history of changes in the [CHANGELOG](https://github.com/metalwarrior665/actor-website-checker/blob/master/CHANGELOG.md)
