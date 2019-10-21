const Auth = require('../../helpers/AuthenticationHelper');
const emails = require('../../helpers/Emails')


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
        console.log(SQLDateTimetoArr('2019-10-20T10:11:44.000Z'))
    })

}