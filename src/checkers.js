const distil = ($) => {
    return $('#distilCaptchaForm').length > 0
        || $('[action*="distil_r_captcha.html"]').length > 0;
};

const accessDenied = ($) => {
    return $('title').text().includes('Access Denied');
};

module.exports.testHtml = ($) => {
    return {
        distil: distil($),
        accessDenied: accessDenied($),
    };
}
