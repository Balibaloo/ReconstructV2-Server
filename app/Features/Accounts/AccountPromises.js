const DEBUG = require("../../../StartServer").DEBUG
const Auth = require('../Authentication/AuthenticationHelper');

module.exports.changeWantedTags = req => new Promise((resolve, reject) => {
    // find which tags to add and which to remove
    req.query.new_tags
    resolve(req)
})

module.exports.setEmailVerified = req => new Promise((resolve, reject) => {
    let sql = 'UPDATE user_profile SET emailValid = 1 WHERE userID = ?'
    req.db.query(sql, req.userData.userID, (err) => {
        if (err) { reject(err) }
        else { resolve(req) }

    })
})

module.exports.saveUserPromise = req => new Promise((resolve, reject) => {
    Auth.genID((userID) => {
        req.userData.userID = userID
        req.db.query(`INSERT INTO user_profile (userID, fName, lName, email, phone)
                    VALUES ?`,
            [[[req.userData.userID, req.userData.fName, req.userData.lName, req.userData.email, req.userData.phone]]],
            (error, result) => {
                if (error) {
                    
                    error.details = 'User save'
                    reject(error)
                } else {
                    console.log('main User Saved')
                    resolve(req)
                }
            })
    });
});

// Update User Info
module.exports.setUsername = req => new Promise((resolve, reject) => {

})

module.exports.getUserProfile = req => new Promise((resolve, reject) => {
    let sql = `SELECT *
        FROM user_profile 
        WHERE userID = ?`

        if (!req.query.userID){
            error = {message : "UserID un defined", code : 404}
            error.customType = "user"
            reject(error)
        }
        
        req.db.query(sql ,req.query.userID, (error, result) => {
            if (error) {
                error.customType = "server"
                reject(error)
            } else if (result[0]) {
                resolve(result[0])
            } else {
                error = {message : "No User Found", code : 404}
                error.customType = "user"
                reject(error)
            };

        });

});

module.exports.deleteUser = (userID,db) => new Promise((resolve, reject) => {
    let sql =`DELETE FROM user_profile WHERE userID = ?`
    db.query(sql,userID,
        (error) => {
            if (error) {
                reject(error)
            } else {
                resolve()
            }
        })
})