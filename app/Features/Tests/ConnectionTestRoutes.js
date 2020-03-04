const Auth = require('../../helpers/AuthenticationHelper');

module.exports = (app, db)  => {
    //tests unauthenticated connections
    app.get('/', (req, res) => {
        console.log('test request received')
        res.json({
            "message": "Connection Successful!"
        });
    });

    //tests authenticated connections
    app.get('/auth', Auth.checkToken, (req, res) => {
        console.log('Auth test request received')
        res.json({
            "message": "Authenticated Connection Successful!"
        });
    });
}