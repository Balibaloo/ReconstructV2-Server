
const Auth = require('../Authentication/AuthenticationHelper');

exports.changeWantedTags = req => new Promise((resolve, reject) => {
    // find which tags to add and which to remove
    req.body.nee_tags
    resolve(req)
})

exports.setEmailVerified = req => new Promise((resolve, reject) => {
    let sql = 'UPDATE user_profile SET emailValid = 1 WHERE userID = ?'
    req.db.query(sql, req.userData.userID, (err) => {
        if (err) { reject(err) }
        else { resolve(req) }

    })
})

exports.saveUserPromise = req => new Promise((resolve, reject) => {
    req.userData = req.body
    Auth.genID((userID) => {
        req.userData.userID = userID
        req.db.query(`INSERT INTO user_profile (userID, fName, lName, email, phone)
                    VALUES ?`,
            [[req.userData.userID, req.userData.first_name, req.userData.last_name, req.userData.email, req.userData.phone]],
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