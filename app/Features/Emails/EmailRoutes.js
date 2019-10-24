const accountPromises = require('../Accounts/AccountPromises');
const Auth = require('../Authentication/AuthenticationHelper')

module.exports.routes = function (app, db) {
    app.get('/verifyEmail', (req, res) => {
        req.db = db
        Auth.verifyEmailVerificationCode(req)
            .then(accountPromises.setEmailVerified)
            .then(res.json({
                "message": "Email Validated Succesfully!"
            }))
            .catch((err) => {
                console.log(err);
            });
    })
}