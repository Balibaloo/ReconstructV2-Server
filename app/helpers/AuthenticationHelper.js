var mysql = require('mysql')    // import mysql
var bcrypt = require('bcrypt')  // import bcrypt (base 64 en/decoding)
var uniqueID = require('uniqid')    // import id generator
var customLog = require('./CustomLogs') // import custom logger

module.exports.authDbParams = {
    host: "localhost",
    user: "ServerAuther",
    password: "G9cgh4GTVX9zU5M", //G9cgh4GTVX9zU5M MwXKe8rGKBVbNzp
    database: "authenticationserver",
}

var authenticationDatabase = mysql.createConnection(this.authDbParams);

// base64 decode the authorisation header to get username and password hash
module.exports.decodeIncomingUP = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("B64 Decoding")

    // append an empty user data object to the request object
    req.userData = {}

    // separate the authenticatiion type and the data
    authCreds = req.headers.authorization.split(' ');

    // base 64 decode the second half (the data) of the header
    // then split the data by a separating colon
    decodedUP = Buffer.from(authCreds[1], 'base64').toString().split(':');

    // separate username and password into variables
    req.userData.username = decodedUP[0]
    req.userData.password = decodedUP[1]

    customLog.values(decodedUP, "decoded U,P")
    customLog.prommiseResolved("B64 Decoded")
    resolve(req)
})

// middleware that checks if the token provided with a request is valid
module.exports.checkToken = (req, res, next) => {
    customLog.connectionStart("Checking Token")
    customLog.incomingData(req.headers.authorization, "authentication header")

    // checks if the token field is not empty and contains at least 2 space separated strings
    if (req.headers.authorization && req.headers.authorization.split(' ')[1]) {
        var authCreds = req.headers.authorization.split(' ');

        // checks if the rihght type of authentication is used
        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];

            customLog.values(userToken, "user token")

            // select all tokens matching provided token
            authenticationDatabase.query(`SELECT * FROM alltokens WHERE Token = ?`, userToken,
                (error, result) => {
                    if (error) {
                        customLog.sendServerError(res, error, error.message)

                    } else if (result[0]) {
                        // if at least one token is found

                        result = result[0]
                        customLog.values(result, "user")

                        // append user information to the request object
                        req.userData = {}
                        req.userData.userToken = result["Token"]
                        req.userData.userID = result["userID"]
                        customLog.prommiseResolved('User Token Authenticated')
                        next();

                    } else {
                        customLog.sendUserError(res, "Token Not Valid", 403)
                    }
                });

        } else {
            customLog.sendUserError(res, "Wrong Auth Type", 403)
        };

    } else {
        customLog.sendUserError(res, "No Credentials Provided", 403)
    };
};

// checks username and password on login
module.exports.validateUP = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("Checking Username Password")

    // fetch the user account
    authenticationDatabase.query(`SELECT salt,password,t.userID,t.emailValid
                        FROM login_credentials
                        JOIN (SELECT emailValid, userID FROM dataserver.user_profile) t
                        ON login_credentials.userID = t.userID
                        WHERE username = ?;
                        `, req.userData.username, (error, user) => {

        if (error) {
            error.details = 'checking username password'
            reject(error);

        } else if (user[0]) {
            // if at least one user is found
            user = user[0]
            
            // check if the users email account has been validated
            if (user.emailValid == 0) {
                reject(new Error("Validate your email to log in"))
            
            } else {
                req.userData.userID = user.userID
                customLog.values(user, "user data")
                userSalt = user.salt

                // hash the provided password with salt from database
                bcrypt.hash(req.userData.password, userSalt, (error, clientHash) => {
                    if (error) {
                        error.details = 'Hashing error'
                        reject(error);

                    } else {
                        // check if hashes match
                        if (clientHash === user.password) {
                            customLog.prommiseResolved("password and hash match")
                            resolve(req)

                        } else {
                            error = new Error('details dont match an account')
                            error.details = 'wrong password'
                            reject(error);
                        }
                    }
                });

            }


        } else {
            error = new Error('No user found')
            error.details = 'wrong username'
            reject(error);
        }
    })
});

// save user authentication details
module.exports.saveUser = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("saving user authentication details")

    // generates an account salt
    bcrypt.genSalt(16, (error, salt) => {

        this.hashPasswordWithSalt(req.userData.password, salt).then((password) => {

            // insert the user details into the database
            authenticationDatabase.query(`INSERT INTO login_credentials
            (userID, username, password, salt)
            VALUES ?`,
                [[[req.userData.userID, req.userData.username, password, salt]]],
                (error) => {
                    if (error) {
                        error.details = 'Saving user'
                        reject(error);

                    } else {
                        customLog.prommiseResolved("new user authentication saved")
                        resolve(req)
                    }
                })

        })

    })
});

module.exports.hashPasswordWithSalt = (password, salt) => new Promise((resolve, reject) => {

    // hash the users password with the account salt
    bcrypt.hash(password, salt, (error, password) => {
        if (error) {
            error.details = 'Hashing password'
            reject(error)

        } else {
            resolve(password)
        }
    })

})

module.exports.changeUserPassword = (req) => new Promise((resolve, reject) => {

    this.getUserSalt(req.userData.userID).then((salt) => {

        console.log(req.query.newPassword, salt)

        // hash the users password with the account salt
        bcrypt.hash(req.query.newPassword, salt, (error, password) => {
            if (error) {
                error.details = 'Hashing password'
                reject(error)

            } else {

                let sql = `UPDATE login_credentials
                SET password = ? WHERE userID = ?`

                // insert the user details into the database
                authenticationDatabase.query(sql, [password, req.userData.userID],
                    (error) => {
                        if (error) {
                            error.details = 'Saving new password'
                            reject(error);

                        } else {
                            customLog.prommiseResolved("Password Changed")
                            resolve(req)
                        }
                    })
            }
        })
    })


})

module.exports.getUserSalt = (userID) => new Promise((resolve, reject) => {

    // check if a user id is provided
    if (userID) {

        let sql = "SELECT salt FROM login_credentials WHERE userID = ?"

        authenticationDatabase.query(sql, userID, (error, results) => {
            if (error) {
                reject(error)

                // check if at least one result exists
            } else if (results[0]) {
                resolve(results[0].salt)

            } else {
                reject(new Error("no user found"))
            }
        })


    } else {
        reject(new Error("no userID provided"))
    }



})

// creates and saves a new acces token for a user
module.exports.createNewToken = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("Creating New Acces Token")

    // check if any active tokens exist
    authenticationDatabase.query(`SELECT * FROM alltokens
        WHERE userID = ?
        AND isValid = 1`, req.userData.userID, (error, result) => {
        if (error) {
            error.details = 'No valid token found'
            reject(error);

        } else {
            if (result[0]) {
                // if at least one active token is found
                // invalidate all active tokens
                invalidateAllTokens(req.userData.userID)
            }

            // generate a new id for the acces token
            this.genID((newToken) => {

                // save the token id so that it can be sent to the user
                req.userData.userToken = newToken

                let sql = `INSERT INTO alltokens
                (Token, userID)
                VALUES ?`

                // save the token in the database
                authenticationDatabase.query(sql, [[[req.userData.userToken, req.userData.userID]]], (error) => {
                    if (error) {
                        error.details = 'saving new token'
                        reject(error)

                    } else {
                        customLog.prommiseResolved("new token registred")
                        resolve(req)
                    }
                }
                )
            })
        };
    });

});

// invalidate all user tokens
var invalidateAllTokens = (userID) => {
    customLog.prommiseStarted("invalidating all tokens")

    let sql = 'UPDATE alltokens SET isValid = 0 WHERE userID = ?'
    authenticationDatabase.query(sql, userID, (error, result) => {
        if (error) {
            throw error

        } else {
            customLog.prommiseResolved("user tokens invalidated")
        }
    })
};

// invalidate a token
module.exports.invalidateToken = (token) => new Promise((resolve, reject) => {
    customLog.prommiseStarted("invalidating token")

    // check if a token is provided
    if (!token) { reject(new Error("no token provided")) }

    let sql = `UPDATE alltokens SET isValid = 0 WHERE Token = ?`

    authenticationDatabase.query(sql, token, (error) => {
        if (error) {
            reject(error)
        } else {
            customLog.prommiseResolved("token invalidated")
            resolve()
        }
    })

})

// checks if a username is already saved in the database
module.exports.checkUsernameAvailable = (username) => new Promise((resolve, reject) => {
    customLog.prommiseStarted("Checking Username is Avaliable")

    let sql = 'SELECT * FROM login_credentials WHERE username = ?'

    // fetch all accounts with a given username
    authenticationDatabase.query(sql, username, (error, results) => {
        if (error) {
            reject(error)

        } else if (results[0]) {
            // if an account with that username is found
            customLog.prommiseResolved("Username is not available")
            resolve(false)
        } else {
            // if no accounts are found
            customLog.prommiseResolved("Username is available")
            resolve(true)
        }
    })

});

// saves an email verrification code with userID
module.exports.saveEmailVerificationCode = (code, userID) => new Promise((resolve, reject) => {
    customLog.prommiseStarted("saving email verrification code")

    let sql = 'INSERT INTO emailverification (userID,verificationID) VALUES ?'

    // insert userID and verrification code
    authenticationDatabase.query(sql, [[[userID, code]]], (error, results) => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("email verrification code saved")
            resolve()
        }
    })
});

// check that the client has provided a valid verrification code
module.exports.verifyEmailVerificationCode = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("Checking Email Verrification")

    req.userData = {}
    req.userData.username = req.query.username
    verificationCode = req.query.verification

    customLog.incomingData(req.userData.username, "username")
    customLog.incomingData(verificationCode, "verrification code")


    if (!verificationCode) {
        reject(new Error("no verrification code provided"))

    } else {
        let sql = `SELECT userID, username FROM login_credentials
                WHERE username = ? AND useriD IN
                (SELECT userID FROM emailverification WHERE verificationID = ?)`

        // execute sql
        authenticationDatabase.query(sql, [req.userData.username, verificationCode], (error, results) => {
            if (error) {
                reject(error)

            } else if (results[0]) {
                // if at least one entry is found
                req.userData.userID = results[0].userID
                customLog.prommiseResolved("Email Verrification Valid")
                resolve(req)

            } else { reject(Error('Code does not exist')) }
        })
    }
});

// get username from userID
module.exports.getUsername = (userID) => new Promise((resolve, reject) => {
    // fetches username given userID

    customLog.prommiseStarted("Getting username")
    customLog.values(userID, "userID")

    // fetch the user account
    authenticationDatabase.query(`SELECT username FROM login_credentials WHERE userID = ?`, userID, (error, results) => {
        if (error) {
            reject(error)

        } if (results[0]) {
            // if a user is found
            customLog.values(results[0].username, "username")
            customLog.prommiseResolved("Username Fetched")
            resolve(results[0].username)

        } else {
            reject(new Error("No User Found"))
        }
    });
});

module.exports.genID = (callback) => {
    // callback that generates new ID
    callback(uniqueID())
};