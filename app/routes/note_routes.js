//router funciton
const Auth = require('../helpers/auther')



module.exports.router = function (app, db) {

    var checkEmail = (db, Email) => {
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

    app.get('/getUser', Auth.checkToken, (req, res) => {
        db.query(`SELECT * FROM user_profile WHERE userID = '${req.headers.userID}' `, function (error, result) {
            if (error) throw error;
            delete result.userID
            res.send(result[0]);
        });
    });

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
                            console.log('resolve 1')
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

    app.post('/', Auth.checkToken, (req, res) => {
        console.log(JSON.stringify(req))
        res.send('Succes Connection')
    });

};