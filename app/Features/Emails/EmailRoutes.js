const accountPromises = require('../Accounts/AccountPromises');
const customErrors = require('../../helpers/CustomErrors')
const Auth = require('../Authentication/AuthenticationHelper')

module.exports = (app, db) => {
    app.get('/verifyEmail', (req, res) => {
        if (true){console.log("==== VERIFYING EMAIL ====")}
        req.db = db
        Auth.verifyEmailVerificationCode(req)
            .then(accountPromises.setEmailVerified)
            .then(() => res.json({
                "message": "Email Validated Succesfully!"
            }))
            .catch((err) => {
                customErrors.logUserError(res,err.message,404)
                console.log(err);
            });
    })
}