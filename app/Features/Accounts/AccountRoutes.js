const Auth = require('../Authentication/AuthenticationHelper');
const accountPromises = require('./AccountPromises')
const customErrorLogger = require('../../helpers/CustomErrors');
const emails = require('../Emails/EmailsPromises');

/// promisify
var checkUniqueEmail = (db, Email) => new Promise((resolve, reject) => {
    //// checks if an email adress is already saved in the databse
    let sql = `SELECT *
    FROM user_profile
    WHERE Email = ?`
    db.query(sql, Email, (error, results) => {
        if (error) {
            reject(error)
        } else if (results[0]) {
            resolve(false)
        } else {
            resolve(true)
        }
    })
});

module.exports = (app, db) => {
    app.post('/createAccount', (req, res) => {
        // requires body.{
        // username, password String
        // first_name , last_name
        // email
        // phone
        //}

        req.db = db
        accountPromises.saveUserPromise(req)
            .then(Auth.saveUser)
            .then(Auth.createNewToken)
            .then(emails.sendAccountVerification)
            .then((req) => {
                res.json({
                    'message': 'User Created',
                    'user_token': req.userData.userToken
                })
            }).catch((req) => {
                customErrorLogger.logServerError(res, req.error, 'User Create Error')
                db.query(`DELETE FROM user_profile WHERE userID = '${req.userData.userID}'`,
                    (error) => {
                        console.log('User Clean up Success')
                    })
            })
    });

    app.get('/auth/login', (req, res) => {

        if (req.headers.authorization) {

            Auth.decodeIncomingUP(req)
                .then(Auth.checkUP)
                .then(Auth.createNewToken)
                .then((req) => {
                    res.json({
                        'message': 'Logged in succesfully',
                        'userToken': req.userData.userToken
                    })
                }).catch((error) => {
                    console.log('Log in error (', error.details, ')', error);
                    customErrorLogger.logServerError(res, error, "Login Error")
                })

        } else {
            customErrorLogger.logUserError(res, "no credentials provided", 403)
        }

    });

    app.get('/getUserProfile', (req, res) => {
        db.query(`SELECT *
                FROM user_profile
                WHERE userID = '${req.body.userID}' `, function (error, result) {
            if (error) {
                customErrorLogger.logServerError(res, error, "Get User Error")
            } else if (result[0]) {
                delete result[0].userID
                res.status(200).json({
                    "message": "Profile Fetches Succesfully",
                    "userProfile": result[0]
                })
            } else {
                customErrorLogger.logUserError(res, "No User Found", 404)
            };

        });
    });

    app.get('/auth/changeWantedTags', Auth.checkToken, (req, res) => {
        req.db = db;
        accountPromises.changeWantedTags(req)
            .then((req) => {
                res.json({
                    "message": 'Wanted Tags Changed Successfully'
                })
            })
            .catch((req) => {
                console.log('Tag Change Error (', req.error.details, ')', req.error.message);
                res.status(500).json({
                    "message": 'Server Error',
                    "error": req.error
                })
            })
    });

    app.post('/auth/addListingtoWatchList', Auth.checkToken, (req, res) => { });

    app.post('/auth/removeListingfromWatchList', Auth.checkToken, (req, res) => { });

    app.get('/auth/getWatchlist', Auth.checkToken, (req, res) => { })

    app.get('/checkUniqueUsername', (req, res) => {
        //// requires body.username
        Auth.checkUniqueUsername(req.body.username).then((isUnique) => {
            res.json({
                "message": isUnique ? 'username available' : "username is already in use",
                "is_unused": isUnique
            });
            console.log("checked unique username")
        }).catch((error) => { customErrorLogger.logServerError(req, error) })

    });

    app.get('/checkUniqueEmail', (req, res) => {
        //// requires body.email
        checkUniqueEmail(db, req.body.email)
            .then((isUnique) => {
                res.json({
                    "message": isUnique ? "email is available" : 'email is already in use',
                    "is_unused": isUnique,
                })
            }).catch((error) => { customErrorLogger.logServerError(req, error) })


    });
}