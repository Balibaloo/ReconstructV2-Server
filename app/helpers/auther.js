var mysql = require('mysql')

const dbhost = "localhost";
const dbuser = "ServerAuther";
const dbpass = "G9cgh4GTVX9zU5M"; //G9cgh4GTVX9zU5M  MwXKe8rGKBVbNzp
const dbName = "authenticationserver";

var authServer = mysql.createConnection({
  host     : dbhost,
  user     : dbuser,
  password : dbpass,
  database : dbName,
});``


module.exports.logToken = (generateToken,userID) => {

    authServer.query(`SELECT * FROM alltokens
    WHERE userID = '${userID}'
    AND isValid = 1`,(err, result) => {
        if (err){console.log(err);res.send('ServerError, please try again later')};
        //ISSUE result returns truthly even when no entries exist
        if (result){userToken = result[0]['Token']
        console.log("token reused")}
        else{
            console.log("new token registred")
            userToken = generateToken()
            authServer.query(`INSERT INTO alltokens
            (Token, isValid, userID, DateCreated)
            VALUES ('${userToken}', 1,'${userID}', '${Date.now()}')`)
            };
        return userToken
        });

    

    };


module.exports.checkToken = (req,res,next) => {
    if (req.originalUrl == '/auth/login'){next()}
    
    else if (req.headers.authorization){
        var authCreds = req.headers.authorization.split(' ');

        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];

            authServer.query(`SELECT * FROM alltokens WHERE Token = '${userToken}'`,
            (err, result) => {

                if (err){console.log(err);res.send('ServerError, please try again later')}

                if (result){
                    console.log(`token : ${result[0]["Token"]}`);
                    
                    req.headers.userID = result[0]["userID"]
                    next();

                    }else{
                        res.send('Error, token not valid')};
            });

        }else{res.send("Error, wrong auth type")};

    }else{
        res.send("Error, no credentials provided")};
};