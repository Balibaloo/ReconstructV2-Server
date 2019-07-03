
//router funciton
const AUTH = require('../helpers/auther')

module.exports.router = function(app, db) {

    app.get('/getUser', (req, res) => {
            db.query(`SELECT * FROM user_profile WHERE userID = '${req.headers.userID}' `, function (err, result) {
                if (err) throw err;
                var results = result;
                res.send(results);
            });
    });

    app.get('/auth/login', (req, res) => {
        if (req.headers.authorization){
            var authCreds = req.headers.authorization.split(' ');
            var decodedCreds = Buffer.from(authCreds[1],'base64').toString();
    
            console.log('decoded : ' + decodedCreds);

            var userID = 'RANDOMID';

            var generateToken = () =>{return 'generatedToken'}

            res.send(AUTH.logToken(generateToken,userID));

        }else{
            res.send("Error, no credentials provided")
        }
    });

};
