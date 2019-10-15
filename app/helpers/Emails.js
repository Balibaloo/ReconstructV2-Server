const nodemailer = require('nodemailer');

/// to send veriffication email, send email to email provided in the user email with random code generated

module.exports.sendAccountVerification = (req) => {
    userEmail = req.userData.email

    //https://MYURL/verifyEmail?
    //verification=CONFIRMATIONCODE
    //&username=USERNAME
};

module.exports.verifyEmail = (req) => new Promise((resolve, reject) => {

});