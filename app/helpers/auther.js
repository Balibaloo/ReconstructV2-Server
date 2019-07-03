var mysql = require('mysql')

const dbhost = "localhost";
const dbuser = "root";
const dbpass = "G9cgh4GTVX9zU5M"; //G9cgh4GTVX9zU5M
const dbName = "authenticationserver";

var autServer = mysql.createConnection({
  host     : dbhost,
  user     : dbuser,
  password : dbpass,
  database : dbName,
});


module.exports.checkCred = (req,res,next) => {
    if (req.headers.authorization){
        var authCreds = req.headers.authorization.split(' ');
        if (authCreds[0] == 'Bearer') {
            const userToken = authCreds[1];
            autServer.query(`SELECT * FROM alltokens`, (err, result) => { //Token = ${userToken}
                console.log(result)
                if (result){
                    console.log(`token : ${userToken}`);
                    console.log(JSON.stringify(result));
                    next();
                    }else{res.send('Error, token not valid')};
            });
        }else{res.send("Error, wrong auth type")};
    }else{res.send("Error, no credentials provided")};
};