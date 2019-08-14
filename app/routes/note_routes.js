//router funciton
/////////////////////// ADD FUNCTION REQUIREMENTS
const Auth = require('../helpers/auther')

var checkUniqueEmail = (db, Email) => {
    db.query(`SELECT * FROM user_profile WHERE Email = '${Email}'`, (error, results) => {
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
    db.query(`SELECT * FROM user_profile WHERE username = '${username}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })

}

var getListing = (req) => new Promise((resolve, reject) => {
    req.db.query(`SELECT * FROM listing WHERE listingID = '${req.body.listingID}'`, (error, results) => {
        results = results[0]
        if (error) {
            req.error = error
            req.error.details = 'select listing'
            reject(req)
        } else if (results) {
            req.results = results
            resolve(req)
        } else {
            req.error = new Error('no listing found')
            req.error.details = 'no listing found'
            reject(req)
        }

    })
})

module.exports.router = function (app, db) {

    app.get('/auth/login', (req, res) => {

        if (req.headers.authorization) {

            var logInPromise = (req) => new Promise((resolve, reject) => {
                req.userData = {}
                var authCreds = req.headers.authorization.split(' ');
                var decodedCreds = Buffer.from(authCreds[1], 'base64').toString().split(':');

                req.userData.username = decodedCreds[0]
                req.userData.password = decodedCreds[1]

                resolve(req)
            })

            logInPromise(req)
                .then(Auth.clientEncode)
                .then(Auth.checkUP)
                .then(Auth.logToken)
                .then((req) => {
                    res.send({
                        'userToken': req.userData.userToken
                    })
                })
                .catch((error) => {
                    console.log('Log in error (', error.details, ')', error);
                    res.send(error)
                })


        } else {
            res.send("Error, no credentials provided")
        }

    });

    app.post('/auth/createAccount', (req, res) => {
        var saveUserPromise = (req) => new Promise((resolve, reject) => {

            var {
                username,
                password,
                firstName,
                lastName,
                email,
                phone
            } = req.body

            req.userData = {
                username,
                password,
                firstName,
                lastName,
                email,
                phone
            }

            Auth.genID((userID) => {
                req.userData.userID = userID
                db.query(`INSERT INTO user_profile (userID, fName, lName, email, phone)
                VALUES ('${req.userData.userID}','${firstName}','${lastName}','${email}',${phone})`,
                    (error, result) => {
                        if (error) {
                            req.error = error
                            req.error.details = 'User save'
                            reject(req)
                        } else {
                            resolve(req)
                        }
                    })
            });
        });

        saveUserPromise(req)
            .then(Auth.clientEncode) ////////////////////////////
            .then(Auth.saveUser)
            .then((req) => {
                res.send('User Created')
            })
            .catch((req) => {
                console.log('User create error (', req.error.details, ')', req.error.message);
                res.send(req.error)
                db.query(`DELETE FROM user_profile WHERE userID = '${req.userData.userID}'`,
                    (error) => {
                        console.log('User Clean up Success')
                    })
            })
    });

    app.get('/', Auth.checkToken, (req, res) => {
        res.send('Succes Connection')
    });

    app.get('/getUserProfile', Auth.checkToken, (req, res) => {
        db.query(`SELECT * FROM user_profile WHERE userID = '${req.headers.userID}' `, function (error, result) {
            if (error) throw error;
            delete result.userID
            res.send(result[0]);
        });
    });

    app.get('/checkUniqueUsername', (req, res) => {
        if (checkUniqueUsername(req.body.username)) {
            res.send('username available')
        } else {
            res.send('username not available')
        }
    });

    app.get('/checkUniqueEmail', (req, res) => {
        if (checkUniqueEmail(req.body.email)) {
            res.send('this email has not been used')
        } else {
            res.send('this email is already linked to an account')
        }
    });

    app.post('/createListing', Auth.checkToken, (req, res) => {})

    app.get('/getListing', (req, res) => {
        getListing(req)
            .then((req) => {
                res.send(req.results)
            })
            .catch((req) => {
                console.log('Listing fetch error (', req.error.details, ')', req.error.message);
                res.send(req.error)
            })
    });

    app.get('/getFrontPageListings', (req, res) => {
        ////////////////// derermine a way to sort the top listings
        ////////////////// send back a list of listings with pictures and titles and item counts and ids
    });

    app.post('/sendMessage', Auth.checkToken, (req, res) => {
        var {
            messageID,
            senderID,
            targetID,
            title,
            body,
            time_sent
        } = req.body

        db.query(`INSERT INTO message_history (messageID,senderID,targetID,title,body,time_sent) VALUES (${messageID},${senderID},${targetID},${title},${body},${time_sent})`, (error, results) => {
            if (error) {
                console.log('message sending error :', error)
                res.send(error)
            } else {
                res.send('message sent')
            }
        })
    })

    app.get('/getUserMessages', Auth.checkToken, (req, res) => {
        db.query(`SELECT * FROM message_history WHERE targetID = '${req.userData.userID}'`, (error, results) => {
            if (error) {
                console.log('message fetch error', error);
                res.send(error)
            } else if (results[0]) {
                res.send(results)
            } else {
                res.send('no messages found')
            }
        })
    })





};