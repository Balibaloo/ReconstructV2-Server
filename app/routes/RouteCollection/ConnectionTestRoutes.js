const Auth = require('../../helpers/AuthenticationHelper');
const emails = require('../../helpers/Emails')
const promises = require('../../helpers/promises')


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

    app.get('/date', (req, res) => {
        req.db = db
        promises.insertNewTags(req)
    })

}