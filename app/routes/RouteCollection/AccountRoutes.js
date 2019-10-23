const Auth = require('../../helpers/AuthenticationHelper');
const promiseCollection = require('../../helpers/promises');
const customErrorLogger = require('../../helpers/CustomErrors');
const emails = require('../../helpers/Emails');
const sqlBuilder = require('sql');

var checkUniqueEmail = (db, Email) => {
    //// checks if an email adress is already saved in the databse
    db.query(`SELECT *
            FROM user_profile
            WHERE Email = '${Email}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })
};

var checkUniqueUsername = (db, username) => {
    //// checks if a username is already saved in the database
    db.query(`SELECT *
            FROM user_profile
            WHERE username = '${username}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })

};

module.exports.routes = function (app, db) {
    app.post('/createAccount', (req, res) => {
        // requires body.{
        // username, password String
        // first_name , last_name
        // email
        // phone
        //}

        req.db = db
        promiseCollection.saveUserPromise(req)
            .then(Auth.clientEncode) ////////////////////////////
            .then(Auth.saveUser)
            .then(Auth.createNewToken)
            .then(emails.sendAccountVerification)
            .then((req) => {
                res.json({
                    'message': 'User Created',
                    'userToken': req.userData.userToken
                })
            }).catch((req) => {
                //console.log('User create error (', req.error.details, ')', req.error.message);
                customErrorLogger.logServerError(res, req.error, 'User Create Error')
                db.query(`DELETE FROM user_profile WHERE userID = '${req.userData.userID}'`,
                    (error) => {
                        console.log('User Clean up Success')
                    })
            })
    });

    app.get('/auth/login', (req, res) => {

        if (req.headers.authorization) {

            promiseCollection.decodeIncomingUP(req)
                .then(Auth.clientEncode) /////////////////////////////////////
                .then(Auth.checkUP)
                .then(Auth.createNewToken)
                .then((req) => {
                    res.json({
                        'message': 'Logged in succesfully',
                        'userToken': req.userData.userToken
                    })
                })
                .catch((error) => {
                    console.log('Log in error (', error.details, ')', error);
                    customErrorLogger.logServerError(res, error, "Login Error")
                })


        } else {
            customErrorLogger.logUserError(res, "no credentials provided", 403)
        }

    });

    app.get('/auth/getUserProfile', Auth.checkToken, (req, res) => {
        db.query(`SELECT *
                FROM user_profile
                WHERE userID = '${req.userData.userID}' `, function (error, result) {
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
        promiseCollection.changeWantedTags(req)
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

    app.get('/checkUniqueUsername', (req, res) => {
        //// requires body.username
        if (checkUniqueUsername(req.body.username)) {
            res.json({
                "isUnused": True,
                "message": 'username available'
            });
        } else {
            res.json({
                "isUnused": False,
                "message": 'username not available'
            });
        }
    });

    app.get('/checkUniqueEmail', (req, res) => {
        //// requires body.email
        if (checkUniqueEmail(req.body.email)) {
            res.json({
                "isUnused": True,
                "message": 'username available'
            });
        } else {
            res.json({
                "isUnused": False,
                "message": 'username not available'
            });
        }
    });
}