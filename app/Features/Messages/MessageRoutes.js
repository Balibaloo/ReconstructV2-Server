const Auth = require('../Authentication/AuthenticationHelper');
const customErrors = require('../../helpers/CustomErrors')

exports = (app, db) => {
    app.post('/sendMessage', Auth.checkToken, (req, res) => {
        Auth.genID((messageID) => {
            let sql = `INSERT INTO message_history
                        (messageID,senderID,targetID,title,body)
                        VALUES ?`
            db.query(sql, [[messageID, req.userData.userID, req.query.targetID, req.query.title, req.query.body]], (error, results) => {
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
    WHERE targetID = ?`, [req.userData.userID], (error, results) => {
            if (error) {
                customErrors.logServerError(res, error, 'Message Fetch Error')
            } else if (results[0]) {
                console.log('User Messages Fetched Successfully')
                res.json({
                    "message": 'Messages Fetched Successfully',
                    "body": results
                })
            } else {
                customErrors.logUserError(res, 'No Messages Found', 400)
            }
        })
    });
}