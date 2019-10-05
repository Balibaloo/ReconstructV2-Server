module.exports.getListing = (req) => new Promise((resolve, reject) => {
    //// pulls a Listing entry from databse given listingID
    req.db.query(`SELECT *
                FROM listing
                WHERE listingID = '${req.body.listingID}'`, (error, results) => {
        results = results[0]
        if (error) {
            req.error = error
            req.error.details = 'select listing'
            reject(req)
        } else if (results) {
            req.listing = results
            resolve(req)
        } else {
            req.error = new Error('no listing found')
            req.error.details = 'no listing found'
            reject(req)
        }

    })
});

module.exports.getListingItems = (req) => new Promise((resolve, reject) => {
    //// pulls every item associated with a listingID from database
    req.db.query(`SELECT *
                FROM listing_item
                WHERE listingID = '${req.body.listingID}'`, (error, results) => {
        if (error) {
            req.error = error
            req.error.details = 'lsiting fetch error'
            reject(req)
        } else if (results[0]) {
            results.forEach((element, index) => {
                //// converts arrays stored in text form to array objects
                results[index].tags = element.tags.replace('[', '').replace(']', '').split(',')
                results[index].images = element.images.replace('[', '').replace(']', '').split(',')
            });

            req.listing.itemList = results

            console.log('listing items fetched successfully')
            resolve(req)
        } else {
            req.error = new Error('no listing items found')
            reject(req)
        }
    })

});

module.exports.saveViewRequest = (req) => new Promise((resolve, reject) => {
    //// logs a view request if the authorID does not match userID
    if (req.userData.userID != req.listing.authorID) {
        Auth.genID((newID) => {
            req.db.query(`INSERT INTO view_log
                    (viewID, userID ,listingID)
                    VALUES ('${newID}', '${req.userData.userID}', '${req.listing.listingID}')`, (error) => {
                if (error) {
                    req.error = error
                    req.error.details = 'lsiting view save error'
                    reject(req)
                } else {
                    resolve(req)
                }
            })
        })
    }
});

module.exports.saveUserPromise = (req) => new Promise((resolve, reject) => {
    req.userData = req.body

    Auth.genID((userID) => {
        req.userData.userID = userID
        db.query(`INSERT INTO user_profile
                (userID, fName, lName, email, phone)
                VALUES ('${req.userData.userID}','${firstName}','${lastName}','${email}',${phone},[])`,
            (error, result) => {
                if (error) {
                    req.error = error
                    req.error.details = 'User save'
                    reject(req)
                } else {
                    resolve(req)
                }
            })
    });
});

module.exports.logInPromise = (req) => new Promise((resolve, reject) => {
    req.userData = {}
    module.exports.authCreds = req.headers.authorization.split(' ');
    module.exports.decodedCreds = Buffer.from(authCreds[1], 'base64').toString().split(':');

    req.userData.username = decodedCreds[0]
    req.userData.password = decodedCreds[1]

    resolve(req)
})