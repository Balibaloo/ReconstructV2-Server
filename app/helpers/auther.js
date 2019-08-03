var mysql = require('mysql')
var bcrypt = require('bcrypt')
var uniqueID = require('uniqid')
var crypto = require('crypto')

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
``

module.exports.logToken = (generateToken, userID, callback) => {
    authServer.query(`SELECT * FROM alltokens
        WHERE userID = '${userID}'
        AND isValid = 1`, (err, result) => {
        if (err) {
            console.log(err);
            res.send('ServerError, please try again later')
        };
        //ISSUE result returns truthly even when no entries exist
        console.log(JSON.stringify(result))
        if (result) {
            userToken = result[0]['Token']
            console.log("token reused")
        } else {
            console.log("new token registred")
            userToken = generateToken()
            authServer.query(`INSERT INTO alltokens
            (Token, isValid, userID, DateCreated)
            VALUES ('${userToken}', 1,'${userID}', '${Date.now()}')`)
        };
        callback(userToken)
    });



};

module.exports.checkToken = (req, res, next) => {
    // add middleware to append user account to req

    if (req.headers.authorization) {
        var authCreds = req.headers.authorization.split(' ');

        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];

            authServer.query(`SELECT * FROM alltokens WHERE Token = '${userToken}'`,
                (err, result) => {

                    if (err) {
                        console.log(err);
                        res.send('ServerError, please try again later')
                    }

                    if (result) {
                        console.log(`token : ${result[0]["Token"]}`);
                        req.headers.userID = result[0]["userID"]
                        next();

                    } else {
                        res.send('Error, token not valid')
                    };
                });

        } else {
            res.send("Error, wrong auth type")
        };

    } else {
        res.send("Error, no credentials provided")
    };
};

module.exports.checkUP = (username, Clienthash, callback) => {
    authServer.query(`SELECT Salt,Password,userID FROM login_credentials WHERE Username = '${username}'`, (err, result) => {
        if (err) {
            console.log(err);
            res.send('ServerError, please try again later')
        } else if (result) {
            userSalt = result[0].Salt
            bcrypt.compare(Clienthash + userSalt, result[0].Password, (error, result) => {
                if (error) {
                    callback(error)
                } else if (result) {
                    callback(null, result[0].UserID)
                } else {
                    callback(new Error('no user found'));
                }
            })
        } else {
            callback(new Error('no user found'))
        }
    })
}

module.exports.generateToken = () => {
    return 'generatedTokens'
} //gerenate token

module.exports.clientEncode = (username, password, clientSalt) => {
    var tohash = password + username
    console.log("stringsalt", clientSalt)
    return password
    //bcrypt.hashSync(tohash, salt = clientSalt)
}
// client(append username and a string to password then hash that) send to server(use username to salt the hash and hash again)

module.exports.saveUser = ([UserID, Username, Password]) => {
    bcrypt.genSalt(16, (err, salt) => {
        bcrypt.hash(Password, salt, (error, Password) => {
            if (error) {
                console.log(error)
            } else {
                authServer.query(`INSERT INTO login_credentials (userID, username, password, salt) VALUES ('${UserID}', '${Username}', '${Password}', '${salt}')`,
                    (error) => {
                        if (error) {
                            console.log(error)
                        }
                    })
            }
        })

    })


}

module.exports.chechUniqueUser = (username) => {
    authServer.query(`SELECT * FROM login_credentials WHERE Username = '${username}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })
}

module.exports.genID = (callback) => {
    callback(uniqueID())
}