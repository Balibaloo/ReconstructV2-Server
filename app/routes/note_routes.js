
//router funciton
module.exports.router = function(app, db) {
    app.get('/getAll', (req, res) => {
            db.query("SELECT * FROM user_profile", function (err, result) {
                if (err) throw err;
                var results = result;
                res.send(JSON.stringify(results));
            });
          });

    app.post('/return', (req, res) => {
        res.send(JSON.stringify(req));
    });
};
