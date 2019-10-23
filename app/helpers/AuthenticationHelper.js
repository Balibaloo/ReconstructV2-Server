var mysql = require('mysql')
var bcrypt = require('bcrypt')
var uniqueID = require('uniqid')

const dbhost = "localhost";
const dbuser = "ServerAuther";
const dbpass = "G9cgh4GTVX9zU5M"; //G9cgh4GTVX9zU5M   MwXKe8rGKBVbNzp
const dbName = "authenticationserver";

var authServer = mysql.createConnection({
    host: dbhost,
    user: dbuser,
    password: dbpass,
    database: dbName,
});

module.exports.checkToken = (req, res, next) => {
    //// middleware that checks if the token provided with a request is valid
    console.log('Checking Token')
    if (req.headers.authorization) {
        var authCreds = req.headers.authorization.split(' ');

        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];

            authServer.query(`SELECT * FROM alltokens WHERE Token = '${userToken}'`,
                (error, result) => {

                    if (error) {
                        console.log(error);
                        res.status(500).json({
                            "messge": 'Server Error, please try again later',
                            "error": error
                        })
                    }

                    if (result[0]) {
                        result = result[0]
                        req.userData = {}
                        req.userData.userToken = result["Token"]
                        req.userData.userID = result["userID"]
                        console.log('User Token Authenticated')
                        next();

                    } else {
                        res.status(403).json({
                            "message": 'Token Not valid'
                        })
                    };
                });

        } else {
            res.status(403).json({
                "message": "Wrong Auth Type"
            })
        };

    } else {
        res.status(403).json({
            "message": "No Credentials Provided"
        })
    };
};

module.exports.clientEncode = (req) => new Promise((resolve, reject) => {
    //// temporary function to act as the client side ecoding for authentication purpouses
    var MasterSalt = '$2b$10$BjJdSB802DiH35SVuhITvO'
    var tohash = req.userData.password + req.userData.username
    bcrypt.hash(tohash, MasterSalt, (error, result) => {
        if (error) {
            req.error = error
            req.error.details = 'Hash Error'
            reject(req)
        } else {
            resolve(req)
        }
    })
});

module.exports.checkUP = (req) => new Promise((resolve, reject) => {
    //// checks username and password on login

    authServer.query(`SELECT salt,password,userID FROM login_credentials WHERE username = '${req.userData.username}'`, (error, user) => {
        user = user[0]
        if (error) {
            req.error = error
            req.error.details = 'User select'
            reject(req);
        } else if (user) {
            req.userData.userID = user.userID
            userSalt = user.salt
            bcrypt.hash(req.userData.password, userSalt, (error, compHash) => {
                if (error) {
                    req.error = error
                    req.error.details = 'Hashing error'
                    reject(req);
                } else {
                    if (compHash === user.password) {
                        resolve(req)
                    } else {
                        error = new Error('No user found')
                        req.error = error
                        req.error.details = 'wrong password'
                        reject(req);
                    }
                }
            });
        } else {
            error = new Error('No user found')
            req.error = error
            req.error.details = 'wrong username'
            reject(req);
        }
    })
});

module.exports.saveUser = (req) => new Promise((resolve, reject) => {
    //// saves user into security databse
    bcrypt.genSalt(16, (error, salt) => {
        bcrypt.hash(req.userData.password, salt, (error, password) => {
            if (error) {
                req.error = error
                req.error.details = 'Hashing'
                reject(req)
            } else {
                authServer.query(`INSERT INTO login_credentials (userID, username, password, salt) VALUES ('${req.userData.userID}', '${req.userData.username}', '${password}', '${salt}')`,
                    (error) => {
                        if (error) {
                            req.error = error
                            req.error.details = 'Saving'
                            reject(req);

                        } else {
                            console.log("new user auth saved")
                            resolve(req)
                        }
                    })
            }
        })

    })
});

module.exports.createNewToken = (req) => new Promise((resolve, reject) => {
    //// given a userID it creates and saves a new acces token
    authServer.query(`SELECT * FROM alltokens
        WHERE userID = '${req.userData.userID}'
        AND isValid = 1`, (error, result) => {
        if (error) {
            req.error = error
            req.error.details = 'No valid token found'
            reject(req);
        } else {
            result = result[0]
        };

        if (result) {
            req.userData.userToken = result['Token']
            // dont give the user their token back, destroy all active tokens
            resolve(req)
        } else {
            this.genID((newToken) => {
                req.userData.userToken = newToken
                authServer.query(`INSERT INTO alltokens
            (Token, isValid, userID)
            VALUES ('${req.userData.userToken}', 1,'${req.userData.userID}')`, (error) => {
                    if (error) {
                        req.error = error
                        req.error.details = 'inserting new token'
                        reject(req)
                    } else {
                        console.log("new token registred")
                        req.userData.userToken = newToken
                        resolve(req)
                    }
                }
                )
            })
        }
    });

});

module.exports.checkUniqueUser = (username) => {
    //// varifies that the username is unique
    authServer.query(`SELECT * FROM login_credentials WHERE Username = '${username}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })
};

module.exports.saveEmailVerificationCode = (code, userID) => new Promise((resolve, reject) => {
    let sql = 'INSERT INTO emailverification (userID,verificationID) VALUES(?,?)'
    authServer.query(sql, [userID, code], (error, results) => {
        if (error) {
            reject(error)
        }
        else {
            resolve()
        }
    })

});

module.exports.verifyEmailVerificationCode = (req) => new Promise((resolve, reject) => {
    req.userData = {}
    req.userData.username = req.query.username
    verificationCode = req.query.verification

    let sql = `SELECT userID, username FROM login_credentials 
                WHERE username = ? AND useriD IN 
                (SELECT userID FROM emailverification WHERE verificationID = ?)`

    authServer.query(sql, [req.userData.username, verificationCode], (error, results) => {
        if (error) {
            reject(error)

        } else if (results) {
            req.userData.userID = results[0].userID
            resolve(req)

        } else { reject(Error('Code does not exist')) }
    })



})

module.exports.getUsername = (userID) => new Promise((resolve, reject) => {
    authServer.query(`SELECT username FROM login_credentials WHERE userID = '${userID}'`, (error, results) => {
        if (error) {
        } if (results[0]) {
            resolve(results[0].username)
        }
        else { }
    });
});

module.exports.genID = (callback) => {
    //// callback that generates new ID
    callback(uniqueID())
};