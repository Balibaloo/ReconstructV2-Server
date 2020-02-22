const Auth = require('../Authentication/AuthenticationHelper') // import authentication helper
const accountPromises = require('./AccountPromises') // import account prommises
const customLog = require('../../helpers/CustomLogs') // import custom logger
const emails = require('../Emails/EmailsPromises') // import email promisses

// check if an email is available
var checkEmailAvailable = (db, Email) => new Promise((resolve, reject) => {
    customLog.prommiseStarted("Checking Email Available")

    let sql = `SELECT *
    FROM user_profile
    WHERE Email = ?`

    // get all accounts with that email
    db.query(sql, Email, (error, results) => {
        if (error) {
            reject(error)

        } else if (results[0]) {
            // if an account with that email is found
            // the email is not available
            resolve(false)

        } else {
            // if no accounts with that email is found
            // the email is available
            resolve(true)
        }
    })
});

module.exports = (app, db) => {

    // create a new account
    app.post('/createAccount', (req, res) => {

        customLog.connectionStart("Creating An Account")
        customLog.incomingData(req.body, "request body")

        // save request body to userData
        req.userData = req.body

        // append database connection to the request object
        req.db = db

        accountPromises.saveUserPromise(req)
            .then(Auth.saveUser)
            .then(Auth.createNewToken)
            .then(emails.sendAccountVerification)
            .then((req) => {
                customLog.sendJson(req.res, {
                    'message': 'User Created',
                    'user_token': req.userData.userToken
                })

            }).catch((error) => {

                // if creating a user fails, delete the inserted data
                // the database is set to cascade on delete so only deleting the main listing is necessary
                accountPromises.deleteUser(req.userData.userID, db)
                    .then(() => {
                        customLog.sendServerError(res, error, 'User Create Error')
                    })
                    .catch((error) => {
                        customLog.sendServerError(res, error, error.message)
                    })
            })
    });

    //*******************************************************************//
    // update a users data
    app.post('/auth/updateUserData', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Updating User Data")
        customLog.incomingData(req.body, "request body")

        res.json({
            'message': 'this functionality is not yet implemented',
        })
    })

    // login (create an auth token)
    app.get('/auth/login', (req, res) => {
        customLog.connectionStart("Logging In")

        // check if credentials are provided by the client
        if (req.headers.authorization) {
            customLog.incomingData(req.headers.authorization, "user credentials")

            Auth.decodeIncomingUP(req)
                .then(Auth.validateUP)
                .then(Auth.createNewToken)
                .then((req) => {

                    customLog.sendJson({
                        'message': 'Logged In',
                        'userToken': req.userData.userToken,
                        "userID": req.userData.userID
                    })

                }).catch((error) => {
                    customLog.sendServerError(res, error, error.message)
                })

        } else {
            // if no login credentials are provided
            customLog.sendUserError(res, "no credentials provided", 403)
        }

    });

    // fetch a users profile
    app.get('/getUserProfile', (req, res) => {
        customLog.connectionStart("Fetching User Profile")

        // check if a userID was provided by the client
        if (!req.query.userID) {
            customLog.sendUserError(res, "No User ID provided")

        } else {
            customLog.incomingData(req.query.userID, "User ID")

            // apend the database connection to the request object
            req.db = db

            // get the users profile
            accountPromises.getUserProfile(req)
                .then(user => {
                    customLog.values(user, "user details")

                    Auth.getUsername(user.userID).then(username => {
                        customLog.values(username, "fetched username")

                        // add username to the user data
                        user.username = username

                        customLog.sendJson({
                            "message": "Profile Fetched ",
                            "userProfile": user
                        })

                    }).catch(error => customLog.sendServerError(res, error, error.message))

                }).catch((error) => {

                    // check if the error was thrown due to user error
                    if (error.isUserError) {
                        customLog.sendUserError(res, error.message)

                    } else {
                        customLog.sendServerError(res, error, error.message)
                    }
                })
        }


    });


    // change a users wanted tags
    app.get('/auth/changeWantedTags', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Changing Wanted Tags")
        customLog.incomingData(req.query.newTags)

        // append database connection to request object
        req.db = db

        accountPromises.changeWantedTags(req)
            .then((req) => {
                customLog.sendJson(req.res,{
                    "message": 'Wanted Tags Changed Successfully'
                })

            }).catch((error) => {
                customLog.sendServerError(res,error,error.message)
            })
    });

    //*******************************************************************/
    // add a listing to users watch list
    app.post('/auth/addListingtoWatchList', Auth.checkToken, (req, res) => {

    });

    //*******************************************************************/
    // remove a listing from a users watch list
    app.post('/auth/removeListingfromWatchList', Auth.checkToken, (req, res) => {

    });

    // fetch a users watcheded listings
    app.get('/auth/getWatchedListings', Auth.checkToken, (req, res) => { })

    // check if a username is available
    app.get('/checkUsernameAvailable', (req, res) => { 
        customLog.connectionStart("Checking Username Available")
        customLog.incomingData(req.query.username,"username")

        Auth.checkUsernameAvailable(req.query.username)
            .then((isAvailable) => {

                customLog.sendJson(res,{
                    "message": isAvailable ? 'username available' : "username is already in use",
                    "isAvailable": isAvailable
                })
        }).catch((error) => { customLog.sendServerError(req, error, error.message) })
    });

    // check if an email is available
    app.get('/checkEmailAvailable', (req, res) => {
        customLog.connectionStart("Checking Email Available")
        customLog.incomingData(req.query.email,"email")

        checkEmailAvailable(db, req.query.email)
            .then((isAvailable) => {

                customLog.sendJson(res,{
                    "message": isAvailable ? "email is available" : 'email is already in use',
                    "isAvailable": isAvailable,
                })
            }).catch((error) => { customLog.sendServerError(req, error, error.message) })


    });

    //*******************************************************************/
    app.post('/resetPassword', (req, res) => {

    })
}