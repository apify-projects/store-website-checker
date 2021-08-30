// TODO: move these to the actors that run the checking themselves

/**
 * @param {import('./types').Cheerio$} $
 */
export function distilCaptcha($) {
    return $('#distilCaptchaForm').length > 0
        || $('[action*="distil_r_captcha.html"]').length > 0;
}

/**
 * @param {import('./types').Cheerio$} $
 */
export function recaptcha($) {
    return $('#recaptcha').length > 0
        || $('iframe[src*="/recaptcha/"]').length > 0;
}

/**
 * @param {import('./types').Cheerio$} $
 */
export function hCaptcha($) {
    return $('[action="/errors/validateCaptcha"]').length > 0;
}

/**
 * @param {import('./types').Cheerio$} $
 */
export function accessDenied($) {
    return $('title').text().includes('Access Denied');
}

/**
 * @param {import('./types').Cheerio$} $
 */
export function testHtml($) {
    return {
        accessDenied: accessDenied($),
        distilCaptcha: distilCaptcha($),
        recaptcha: recaptcha($),
        hCaptcha: hCaptcha($),
    };
}
