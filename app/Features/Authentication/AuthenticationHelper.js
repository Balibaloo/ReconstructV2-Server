var mysql = require('mysql')
var bcrypt = require('bcrypt')
var uniqueID = require('uniqid')
var customErrors = require('../../helpers/CustomErrors')
const DEBUG = require("../../../StartServer").DEBUG

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
    if (DEBUG.debug){console.log("==B64 Decoding==")}

    req.userData = {}

    authCreds = req.headers.authorisation.split(' ');
    decodedCreds = Buffer.from(authCreds[1], 'base64').toString().split(':');

    req.userData.username = decodedCreds[0]
    req.userData.password = decodedCreds[1]
    if (DEBUG.values) {console.log("decoded U, P = " + decodedCreds)}

    resolve(req)
})

exports.checkToken = (req, res, next) => {
    if (DEBUG.debug){console.log("==Checking Token==")}
    //// middleware that checks if the token provided with a request is valid

    // checks if the token field is not empty
    if (req.headers.authorisation) {
        var authCreds = req.headers.authorisation.split(' ');

        // checks if the rihght type of authentication is used
        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];

            authServer.query(`SELECT * FROM alltokens WHERE Token = ?`,userToken,
                (error, result) => {
                    // check if the token matches an active one in the database
                    if (error) {
                        customErrors.logServerError(res, error, error.message)
                    } else if (result[0]) {
                        // append user information to the request object
                        result = result[0]
                        if (DEBUG.values){console.log("User = ", result)}
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

    if (DEBUG.debug){console.log("==Checking Username Password==")}
    if (DEBUG.values) {console.log("decoded U, P = " , [req.userData.username,req.userData.password])}


    // fetches the user account on username
    authServer.query(`SELECT salt,password,userID
                        FROM login_credentials
                        WHERE username = ?`,req.userData.username, (error, user) => {
        user = user[0]
        if (error) {
            error = error
            error.details = 'no Username'
            reject(error);

        } else if (user) {
            req.userData.userID = user.userID
            if (DEBUG.values) {console.log("User Data = ", user)}
            userSalt = user.salt

            // hashing with salt from database
            bcrypt.hash(req.userData.password, userSalt, (error, compHash) => {
                if (error) {
                    error = error
                    error.details = 'Hashing error'
                    reject(error);

                } else {
                    // checking if hashes match
                    if (compHash === user.password) {
                        if (DEBUG.debug){console.log("pasword hash matches")}
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
    if (DEBUG.debug){console.log("==Saving User Auth==")}
    //// saves user into security databse

    // generates a salt and hashses password with new salt
    bcrypt.genSalt(16, (error, salt) => {
        bcrypt.hash(req.userData.password, salt, (error, password) => {
            if (error) {
                error.details = 'Hashing'
                reject(error)

            } else {
                authServer.query(`INSERT INTO login_credentials
                                (userID, username, password, salt)
                                VALUES ?`,
                                [[req.userData.userID,req.userData.username,password,salt]],
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
    if (DEBUG.debug){console.log("==Creating New Acces Token==")}
    // check if any active tokens exist
    authServer.query(`SELECT * FROM alltokens
        WHERE userID = ?
        AND isValid = 1`,req.userData.userID, (error, result) => {
        if (error) {
            error.details = 'No valid token found'
            reject(error);
        } else {
            result = result[0]
        };

        if (result) {
            // delete all active tokens
            invalidateAllTokens(req.userData.userID)
        } 
        
        this.genID((newToken) => {
            req.userData.userToken = newToken
            let sql = `INSERT INTO alltokens
            (Token, userID)
            VALUES ?`
            authServer.query(sql,[[[req.userData.userToken,req.userData.userID]]] , (error) => {
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
    
    });

});

var invalidateAllTokens = (userID) => {
    // set all tokens invalid of a userID
    if (DEBUG.debug){console.log("cleaning old tokens")}

    let sql = 'UPDATE alltokens SET isValid = 0 WHERE userID = ?'
    authServer.query(sql, userID, (error, result) => {
        if (error) {
            console.log(error)
        }
    })
};

exports.checkUniqueUsername = (username) => new Promise((resolve, reject) => {
    //// checks if a username is already saved in the database

    if (DEBUG.debug){console.log("==Checking Username Uniqueue==")}
    
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

    // saves an email verrification code with userID
module.exports.saveEmailVerificationCode = (code, userID) => new Promise((resolve, reject) => {
    if (DEBUG.debug){console.log("==Saving Email Verrification==")}
    
    let sql = 'INSERT INTO emailverification (userID,verificationID) VALUES ?'
    authServer.query(sql, [[userID, code]], (error, results) => {

        if (error) {
            reject(error)
        }
        else {
            resolve()
        }
    })

});

exports.verifyEmailVerificationCode = req => new Promise((resolve, reject) => {
    // checks if given email verrification code exists in database

    if (DEBUG.debug){console.log("==Checking Email Verrification==")}
    if (DEBUG.values){console.log("code = ", verificationCode)}

    req.userData = {}
    req.userData.username = req.query.username
    verificationCode = req.query.verification

    let sql = `SELECT userID, username FROM login_credentials
                WHERE username = ? AND useriD IN
                (SELECT userID FROM emailverification WHERE verificationID = ?)`

    authServer.query(sql, [req.userData.username, verificationCode], (error, results) => {
        if (error) {
            reject(error)

        } else if (results[0]) {
            req.userData.userID = results[0].userID
            resolve(req)

        } else { reject(Error('Code does not exist')) }
    })



});

exports.getUsername = (userID) => new Promise((resolve, reject) => {
    // fetches username given userID

    if (DEBUG.debug){console.log("==Fetching Username==")}
    if (DEBUG.values){console.log("useriD = ", userID)}

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