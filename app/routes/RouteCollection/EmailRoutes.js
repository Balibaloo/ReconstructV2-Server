const nodemailer = require('nodemailer');
const emailPromises = require('../../helpers/Emails')

module.exports.routes = function (app, db) {
    app.get('/verifyEmail',(req,res) => {
        username = req.body.username
        verificationCode = req.body.verification

        req.db = db
        emailPromises.verifyEmail(req)
        .then()
        .catch();
    })

}