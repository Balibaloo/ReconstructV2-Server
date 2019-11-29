
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