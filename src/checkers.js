const distilCaptcha = ($) => {
    return $('#distilCaptchaForm').length > 0
        || $('[action*="distil_r_captcha.html"]').length > 0;
};

const accessDenied = ($) => {
    return $('title').text().includes('Access Denied');
};

const recaptcha = ($) => {
    return $('#recaptcha').length > 0
        || $('iframe[src*="/recaptcha/"]').length > 0
}

module.exports.testHtml = ($) => {
    return {
        distilCaptcha: distilCaptcha($),
        accessDenied: accessDenied($),
        recaptcha: recaptcha($),
    };
}
