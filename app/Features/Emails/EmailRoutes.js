const accountPromises = require('../Accounts/AccountPromises')  // import account promisses
const customLog = require('../../helpers/CustomLogs')   // import custom logger
const Auth = require('../../helpers/AuthenticationHelper')  // import authentication helper

module.exports = (app, db) => {

    // verify an email
    app.get('/verifyEmail', (req, res) => {
        customLog.connectionStart("Verifying Email")
        customLog.incomingData(req.query.username, "username")
        customLog.incomingData(req.query.verification, "verrification code")
        
        // append the database connection to the request object
        req.db = db
        
        // check if the code provided by the client is valid
        // then set their email as being verified
        Auth.verifyEmailVerificationCode(req)
            .then(accountPromises.setEmailVerified)
            .then(() => customLog.sendJson(res,{
                "message": "Email Validated"
            }))
            .catch((error) => {
                customLog.sendServerError(res,error, error.message)
            });
    })
}