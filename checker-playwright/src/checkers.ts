import type { CheerioAPI } from 'cheerio';

export function distilCaptcha($: CheerioAPI): boolean {
    return $('#distilCaptchaForm').length > 0
        || $('[action*="distil_r_captcha.html"]').length > 0;
}

export function recaptcha($: CheerioAPI): boolean {
    return $('#recaptcha').length > 0
        || $('iframe[src*="/recaptcha/"]').length > 0;
}

export function hCaptcha($: CheerioAPI): boolean {
    return $('[action="/errors/validateCaptcha"]').length > 0;
}

export function accessDenied($: CheerioAPI): boolean {
    return $('title').text().includes('Access Denied');
}

export function testHtml($: CheerioAPI) {
    return {
        accessDenied: accessDenied($),
        distilCaptcha: distilCaptcha($),
        recaptcha: recaptcha($),
        hCaptcha: hCaptcha($),
    };
}
