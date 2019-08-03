//router funciton
const Auth = require('../helpers/auther')



module.exports.router = function (app, db) {

    var checkEmail = (db, Email) => {
        db.query(`SELECT * FROM user_profile WHERE Email = '${Email}'`, (err, results) => {
            if (err) {
                console.log(err)
            } else if (results) {
                return false
            } else {
                return true
            }
        })
    }

    app.get('/getUser', Auth.checkToken, (req, res) => { //implement use of req.userdata
        db.query(`SELECT * FROM user_profile WHERE userID = '${req.headers.userID}' `, function (err, result) {
            if (err) throw err;
            var results = result;
            res.send(results);
        });
    });

    app.get('/auth/login', (req, res) => {
        //get creds, check creds, get user id from creds, generate toke, save token with id
        if (req.headers.authorization) {
            var authCreds = req.headers.authorization.split(' ');
            var decodedCreds = Buffer.from(authCreds[1], 'base64').toString().split(':'); // gets plaintext username and password

            decodedCreds = {
                "username": decodedCreds[0],
                "password": decodedCreds[1]
            }

            Auth.checkUP(decodedCreds.username, decodedCreds.password, (error, userID) => {
                if (error) {
                    res.send(error)
                } else if (userID) {
                    //passed credential verification
                    Auth.logToken(Auth.generateToken, userID, (error, token) => {
                        if (error) {
                            res.send(error)
                        } else {
                            console.log("output token : ", token)
                            res.send(token)
                        }
                    })


                }

            }); //use decodedcreds to get user id AUTH.clientEncode(decodedCreds,"salt") 
        } else {
            res.send("Error, no credentials provided")
        }
    });

    app.post('/auth/createAccount', (req, res) => {
        var saveUserPromise = (req) => new Promise((resolves, rejects) => {
            var {
                Username,
                Password,
                FirstName,
                LastName,
                Email,
                Phone
            } = req.body

            Password = Auth.clientEncode(Username, Password, 'baseString') //remove for front end dev

            Auth.genID((userID) => {
                console.log('generated', userID)
                db.query(`INSERT INTO user_profile (userID, Fname, Lname, Email, Phone)
                VALUES ('${userID}','${FirstName}','${LastName}','${Email}',${Phone})`,
                    (error, result) => {
                        if (error) {
                            rejects(error)
                        } else {
                            console.log("data:", userID, Username, Password)
                            resolves([userID, Username, Password])
                        }
                    })
            });

        })

        saveUserPromise(req)
            .then(Auth.saveUser)
            .catch((error) => {
                console.log(error.message);
                res.send(error)
            })

    })

    app.post('/', Auth.checkToken, (req, res) => {
        console.log(JSON.stringify(req))
        res.send('Succes Connection')
    })

};