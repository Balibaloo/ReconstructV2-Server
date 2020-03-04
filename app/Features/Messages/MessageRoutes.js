const Auth = require('../../helpers/AuthenticationHelper')
const customLog = require('../../helpers/CustomLogs')
const debug = require('../../../StartServer').DEBUG

module.exports = (app, db) => {
 
    // send a message
    app.post('/sendMessage', Auth.checkToken, (req, res) => {
        // log start of request
        customLog.connectionStart("Sending Message")
        
        // generate an new id for the message id
        Auth.genID((messageID) => {
            let sql = `INSERT INTO message_history
                        (messageID,senderID,targetID,title,body)
                        VALUES ?`
            db.query(sql, [[messageID, req.userData.userID, req.query.targetID, req.query.title, req.query.body]], (error, results) => {

                if (error) {
                    customLog.sendServerError(res, error, "Send Message Error")

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
        // log start of request
        customLog.connectionStart("Fetching User Messages")

        db.query(`SELECT *
    FROM message_history
    WHERE targetID = ?`, req.userData.userID, (error, results) => {
            if (error) {
                customLog.sendServerError(res, error, 'User Message Fetch Error')

            } else if (results[0]) {
                // if the result object contains at least one entry
                
                console.log('User Messages Fetched Successfully')
                res.json({
                    "message": 'Messages Fetched Successfully',
                    "body": results
                })
            } else {
                customLog.sendUserError(res, 'No Messages Found', 400)
            }
        })
    });


    

    /* TODO
     add fetch message route that just returns message and marks it as read unless user who sent it requested it
    */



}