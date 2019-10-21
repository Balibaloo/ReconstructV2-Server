const Auth = require('../../helpers/AuthenticationHelper');
const sqlBuilder = require('sql')
const customErrors = require('../../helpers/CustomErrors')

module.exports.routes = function (app, db) {
    app.post('/sendMessage', Auth.checkToken, (req, res) => {
        Auth.genID((messageID) => {
            db.query(`INSERT INTO message_history
(messageID,senderID,targetID,title,body)
VALUES ('${messageID}','${req.userData.userID}','${req.body.targetID}','${req.body.title}','${req.body.body}')`, (error, results) => {
                if (error) {
                    logServerError(res, error, "Send Message Error")
                } else {
                    console.log('User Message Sent Successfully')
                    res.json({
                        "message": 'Message Sent'
                    })
                }
            })
        })

    });

    app.get('/getUserMessages', Auth.checkToken, (req, res) => {
        db.query(`SELECT *
    FROM message_history
    WHERE targetID = '${req.userData.userID}'`, (error, results) => {
            if (error) {
                customErrors.logServerError(res, error, 'Message Fetch Error')
            } else if (results[0]) {
                console.log('User Messages Fetched Successfully')
                res.json({
                    "message": 'Messages Fetched Succesfully',
                    "Data": results
                })
            } else {
                customErrors.logUserError(res, 'No Messages Found', 400)
            }
        })
    });
}