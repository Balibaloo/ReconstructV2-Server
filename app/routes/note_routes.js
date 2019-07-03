
//router funciton
module.exports.router = function(app, db) {
    app.get('/getAll', (req, res) => {
            db.query("SELECT * FROM user_profile", function (err, result) {
                if (err) throw err;
                var results = result;
                res.send(JSON.stringify(results));
            });
          });

    app.post('/testPost',(req,res) => {
        res.send('succes post')
    })
    
    app.get('/testGet',(req,res) => {
        res.send('sucess get')
    })

    app.post('/users/authenticate', (req, res) => {
        if (req.headers.authorization){
            var authCreds = req.headers.authorizationl;
            var encodedCreds = authCreds.split(' ')[1];
            var decodedCreds = Buffer.from(encodedCreds,'base64').toString();
    
            console.log('decoded : ' + decodedCreds);
        }else{
            res.send("Error, no credentials provided")
        }
    });
};
