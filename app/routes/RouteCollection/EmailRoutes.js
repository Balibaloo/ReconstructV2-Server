const promises = require('../../helpers/promises');
const Auth = require('../../helpers/AuthenticationHelper')

module.exports.routes = function (app, db) {
    app.get('/verifyEmail', (req, res) => {
        req.db = db
        Auth.verifyEmailVerificationCode(req)
            .then(promises.setEmailVerified)
            .then(res.json({
                "message": "Email Validated Succesfully!"
            }))
            .catch((err) => {
                console.log(err);
            });
    })
}