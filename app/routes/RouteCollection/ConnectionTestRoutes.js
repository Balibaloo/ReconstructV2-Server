const Auth = require('../../helpers/auther');

module.exports.routes = function (app, db) {
    app.get('//', Auth.checkToken, (req, res) => {
        console.log('Auth test request received')
        res.json({
            "message": "Authenticated Conection Successful!"
        });
    });

    app.get('/', (req, res) => {
        console.log('test request received')
        res.json({
            "message": "Conection Successful!"
        });
    });


}