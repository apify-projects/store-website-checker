## Website Checker

Website checker is a simple actor that allows you to scan any website for performance and blocking.

### Features

The actor provides these useful features out of the box:

- Collects response status codes
- Recognizes the most common captchas
- Saves HTML snapshots and screenshots (if Puppeteer is chosen)
- Enables choosing between Cheerio (plain HTTP) and Puppeteer (browser) scraper
- Enables re-scraping start URLs or enqueueing with a familiar link selector + pseudo URLs system
- Handles different failure states like timeouts and network errors
- Enables basic proxy and browser configuration

#### Planned features

- Usage calculation/stats
- Better automatic workloads/workload actors
- Add support for Playwright + Firefox

### How to use

The most common use-case is to do a quick check on how aggressively the target site is blocking. In that case just supply a start URL, ideally a category one or product one. You can either set `replicateStartUrls` or add enqueueing with `linkSelector` + `pseudoUrls`, both are good options to test different proxies. You can test a few different proxy groups and compare `cheerio` vs `puppeteer` options.

In the end you will get a simple statistics about the blocking rate. It is recommended to check a few screenshots just to make sure the actor correctly recognized the page status. You can get to the detailed output (per URL) via KV store or dataset (the KV output sorts by response status while dataset is simply ordered by scraping order).

#### Checker workloads

To make your life easier, you can use other actors that will start more checker runs at once and aggregate the result. This way you can test more sites at once or different cheerio/browser and proxy combinations and compare those.

All of these actors are very young so we are glad for any feature ideas:
[lukaskrivka/website-checker-workload](https://apify.com/lukaskrivka/website-checker-workload)
[vaclavrut/website-checker-starter](https://apify.com/vaclavrut/website-checker-starter)

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

#### Detailed output with URLs, screenshots and HTML links
<https://api.apify.com/v2/key-value-stores/zT3zxpd53Wv9m9ukQ/records/DETAILED-OUTPUT?disableRedirect=true>

### Changelog

Check history of changes in the [CHANGELOG](https://github.com/metalwarrior665/actor-website-checker/blob/master/CHANGELOG.md)
