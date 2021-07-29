### 2021-07-29
*Features*
- Pushing metadata about each page to dataset

*Changes*
- Removed `useGoogleBotHeaders` option (we don't want to impersonate Google anyway)
- Updated `apify` from `0.18.1` to `1.3.1`
- `saveSnapshots` is `true` by default
- Added recognition of Amazon's `hCaptcha`
- `success` and `wasSuccess` metrics added to output. Success is measured by status being less than 400 and no captcha