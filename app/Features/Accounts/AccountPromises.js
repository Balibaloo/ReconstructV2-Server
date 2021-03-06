const Auth = require('../../helpers/AuthenticationHelper'); // import authentication helper
const customLog = require('../../helpers/CustomLogs') // import custom logger

//****************************************************************************//
module.exports.changeWantedTags = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("changing wanted tags")
    // find which tags to add and which to remove
    req.query.new_tags
    resolve(req)
})

// set a users email as valid
module.exports.setEmailVerified = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("setting email as valid")

    let sql = 'UPDATE user_profile SET emailValid = 1 WHERE userID = ?'

    req.db.query(sql, req.userData.userID, (error) => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("email set as valid")
            resolve(req)
        }

    })
})

// save user data
module.exports.saveUser = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("Saving User main")

    // generate a userID
    Auth.genID((userID) => {

        // save userID into user data object
        req.userData.userID = userID

        // insert user
        req.db.query(`INSERT INTO user_profile (userID, fName, lName, email, phone)
                    VALUES ?`,
            [[[req.userData.userID, req.body.fName, req.body.lName, req.body.email, req.body.phone]]],
            (error, result) => {
                if (error) {
                    error.details = 'saving main user'
                    reject(error)

                } else {
                    customLog.prommiseResolved('main User Saved')
                    resolve(req)
                }
            })
    });
});

//****************************************************************************/
// Update Username
module.exports.setUserDetails = req => new Promise((resolve, reject) => {
    
    // update user
    req.db.query(`UPDATE user_profile SET fName = ?, lName = ?, email = ?, phone = ?
                WHERE `,
        [[[req.userData.userID, req.body.first_name, req.body.last_name, req.body.email, req.body.phone]]],
        (error, result) => {
            if (error) {
                error.details = 'saving main user'
                reject(error)

            } else {
                customLog.prommiseResolved('main User Saved')
                resolve(req)
            }
        })

})

// fetch a users profile
module.exports.getUserProfile = req => new Promise((resolve, reject) => {
    customLog.connectionStart("Fetching User Profile")

    // check if a userid is provided
    if (!req.query.userID) {
        reject({ message: "UserID not defined", isUserError: true })

    } else {
        customLog.values(req.query.userID, "userID")

        let sql = `SELECT *
        FROM user_profile 
        WHERE userID = ?`

        req.db.query(sql, req.query.userID, (error, result) => {
            if (error) {
                reject(error)

            } else if (result[0]) {
                // if at least one user is found
                customLog.prommiseResolved("User profile Fetched")
                resolve(result[0])

            } else {
                // if no user is found
                reject({ message: "No User Found", isUserError: true })
            };

        });
    }
});

// delete a user
module.exports.deleteUser = (userID, db) => new Promise((resolve, reject) => {
    customLog.prommiseStarted("deleting user")

    let sql = `DELETE FROM user_profile WHERE userID = ?`

    db.query(sql, userID, (error) => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("user deleted")
            resolve()
        }
    })
})