var mysql = require('mysql')
var bcrypt = require('bcrypt')
var uniqueID = require('uniqid')
var customErrors = require('../../helpers/CustomErrors')

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

exports.decodeIncomingUP = req => new Promise((resolve, reject) => {
    req.userData = {}
    authCreds = req.headers.authorisation.split(' ');
    decodedCreds = Buffer.from(authCreds[1], 'base64').toString().split(':');

    req.userData.username = decodedCreds[0]
    req.userData.password = decodedCreds[1]

    resolve(req)
})

exports.checkToken = (req, res, next) => {
    //// middleware that checks if the token provided with a request is valid
    console.log('Checking Token')
    if (req.headers.authorization) {
        var authCreds = req.headers.authorization.split(' ');

        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];

            authServer.query(`SELECT * FROM alltokens WHERE Token = '${userToken}'`,
                (error, result) => {

                    if (error) {
                        customErrors.logServerError(res, error, error.message)
                    } else if (result[0]) {
                        result = result[0]
                        req.userData = {}
                        req.userData.userToken = result["Token"]
                        req.userData.userID = result["userID"]
                        console.log('User Token Authenticated')
                        next();

                    } else {
                        customErrors.logUserError(res, "Token Not Valid", 403)
                    }
                });

        } else {
            customErrors.logUserError(res, "Wrong Auth Type", 403)
        };

    } else {
        customErrors.logUserError(res, "No Credentials Provided", 403)
    };
};

exports.checkUP = req => new Promise((resolve, reject) => {
    //// checks username and password on login

    console.log("U = "+ req.userData.username)
    console.log("P = "+ req.userData.password)


    authServer.query(`SELECT salt,password,userID FROM login_credentials WHERE username = '${req.userData.username}'`, (error, user) => {
        user = user[0]
        if (error) {
            error = error
            error.details = 'no Username'
            reject(error);

        } else if (user) {
            req.userData.userID = user.userID
            userSalt = user.salt
            bcrypt.hash(req.userData.password, userSalt, (error, compHash) => {
                if (error) {
                    error = error
                    error.details = 'Hashing error'
                    reject(error);

                } else {
                    if (compHash === user.password) {
                        resolve(req)
                    } else {
                        error = new Error('No user found')
                        error.details = 'wrong password'
                        reject(error);
                    }
                }
            });
        } else {
            error = new Error('No user found')
            error.details = 'wrong username'
            reject(error);
        }
    })
});

exports.saveUser = req => new Promise((resolve, reject) => {
    //// saves user into security databse
    bcrypt.genSalt(16, (error, salt) => {
        bcrypt.hash(req.userData.password, salt, (error, password) => {
            if (error) {
                
                error.details = 'Hashing'
                reject(error)

            } else {
                authServer.query(`INSERT INTO login_credentials (userID, username, password, salt) VALUES ('${req.userData.userID}', '${req.userData.username}', '${password}', '${salt}')`,
                    (error) => {
                        if (error) {
                            
                            error.details = 'Saving'
                            reject(error);

                        } else {
                            console.log("new user auth saved")
                            resolve(req)
                        }
                    })
            }
        })

    })
});

exports.createNewToken = req => new Promise((resolve, reject) => {
    //// given a userID it creates and saves a new acces token
    authServer.query(`SELECT * FROM alltokens
        WHERE userID = '${req.userData.userID}'
        AND isValid = 1`, (error, result) => {
        if (error) {
            
            error.details = 'No valid token found'
            reject(error);

        } else {
            result = result[0]
        };

        if (result) {
            destroyAllTokens(req.userData.userID)
        } else {
            this.genID((newToken) => {
                req.userData.userToken = newToken
                authServer.query(`INSERT INTO alltokens
            (Token, isValid, userID)
            VALUES ('${req.userData.userToken}', 1,'${req.userData.userID}')`, (error) => {
                    if (error) {
                        
                        error.details = 'inserting new token'
                        reject(error)
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

var destroyAllTokens = (userID) => {
    let sql = 'UPDATE alltokens SET isValid = 0 WHERE userID = ?'

    authServer.query(sql, userID, (error, result) => {
        if (error) {
            console.log(error)
        }
    })
}

exports.checkUniqueUsername = (username) => new Promise((resolve, reject) => {
    //// checks if a username is already saved in the database
    let sql = 'SELECT * FROM login_credentials WHERE username = ?'
    authServer.query(sql, username, (error, results) => {
        if (error) {
            reject(error)
        } else if (results[0]) {
            resolve(false)
        } else {
            resolve(true)
        }
    })

});

exports.saveEmailVerificationCode = (code, userID) => new Promise((resolve, reject) => {
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

exports.verifyEmailVerificationCode = req => new Promise((resolve, reject) => {
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


// unused
exports.getUsername = (userID) => new Promise((resolve, reject) => {
    authServer.query(`SELECT username FROM login_credentials WHERE userID = '${userID}'`, (error, results) => {
        if (error) {
        } if (results[0]) {
            resolve(results[0].username)
        }
        else { reject() }
    });
});

exports.genID = (callback) => {
    //// callback that generates new ID
    callback(uniqueID())
};