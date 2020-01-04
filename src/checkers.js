const distilCaptcha = ($) => {
    return $('#distilCaptchaForm').length > 0
        || $('[action*="distil_r_captcha.html"]').length > 0;
};

const accessDenied = ($) => {
    return $('title').text().includes('Access Denied');
};

module.exports.testHtml = ($) => {
    return {
        distilCaptcha: distilCaptcha($),
        accessDenied: accessDenied($),
    };
}
