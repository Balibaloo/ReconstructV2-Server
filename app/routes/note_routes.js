
//router funciton
module.exports.router = function(app, db) {
    app.get('/notes', (req, res) => {
            db.query("SELECT * FROM user_profile", function (err, result) {
                if (err) throw err;
                var results = result;
                res.send(JSON.stringify(results));
            });
          });

    app.post('/record', (req, res) => {
        res.send('wrote it down');
    });
};
