const Auth = require('../helpers/auther');
const imageHandler = require('../helpers/imageHandler');
const promiseCollection = require('../helpers/promises');
const GSON = require('gson');

//////////////////////////////////////////////////////////////////////////////  HELPER FUNCTIONS

var checkUniqueEmail = (db, Email) => {
    //// checks if an email adress is already saved in the databse
    db.query(`SELECT *
            FROM user_profile
            WHERE Email = '${Email}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })
};

var checkUniqueUsername = (db, username) => {
    //// checks if a username is already saved in the database
    db.query(`SELECT *
            FROM user_profile
            WHERE username = '${username}'`, (error, results) => {
        if (error) {
            console.log(error)
        } else if (results) {
            return false
        } else {
            return true
        }
    })

};

var arrayToSQL = (arr) => {
    //// converts an array to an SQL insertable format String
    let finalString = '('
    arr.forEach((item, index) => {
        if (index !== 0) {
            finalString += ' ,'
        }

        finalString += `"${item}"`
    })
    finalString += ')'
    return finalString

};

var genSQLFromItemList = (listingItemList) => {
    let itemListString = ''
    listingItemList.forEach((item, index) => {
        if (index !== 0) {
            itemListString += ','
        }
        Auth.genID((newID) => {
            itemListString += arrayToSQL([newID, listingID, item.name, item.description, item.tags, item.images])
        })
    })
}

//////########### ASSSSSIVE OVERHAUL

var logServerError = (res, error, message = "Server Error") => {
    console.log(message, error)
    res.status(500).json({
        "message": message,
        "error": error
    })
};

var logUserError = (res, message = "User Error", code = 400) => {
    console.log(message)
    res.status(code).json({
        "message": message
    })
}

module.exports.router = function (app, db) {

    //////////////////////////////////////////////////////////////////////////  TEST ZONE

    app.get('/getImages', (req, res) => {
        if (!req.query.images) {
            res.send("No images given to load")
        } else {
            imageHandler.getImages(req.query.images).then((loadedImages) => {
                    res.send(loadedImages);
                    console.log(loadedImages)
                })
                .catch(console.log)
        }
    });

    app.get('/', (req, res) => {
        console.log('request received')
        res.json({
            "message": "Conection Successful!"
        });
    });

    app.get('//', Auth.checkToken, (req, res) => {
        res.json({
            "message": "Authenticated Conection Successful!"
        });
    });

    //////////////////////////////////////////////////////////////////////////  SMALL DYNAMIC REQUESTS

    app.get('/checkUniqueUsername', (req, res) => {
        //// requires body.username
        if (checkUniqueUsername(req.body.username)) {
            res.json({
                "isUnused": True,
                "message": 'username available'
            });
        } else {
            res.json({
                "isUnused": False,
                "message": 'username not available'
            });
        }
    });

    app.get('/checkUniqueEmail', (req, res) => {
        //// requires body.email
        if (checkUniqueEmail(req.body.email)) {
            res.json({
                "isUnused": True,
                "message": 'username available'
            });
        } else {
            res.json({
                "isUnused": False,
                "message": 'username not available'
            });
        }
    });

    //////////////////////////////////////////////////////////////////////////  USER ACCOUTNS

    app.post('/createAccount', (req, res) => {
        // requires body.{
        // username, password String
        // firstName , lastName
        // email
        // phone
        //}

        promiseCollection.saveUserPromise(req)
            .then(Auth.clientEncode) ////////////////////////////
            .then(Auth.saveUser)
            .then(Auth.logToken)
            .then((req) => {
                res.json({
                    'message': 'User Created',
                    'userToken': req.userData.userToken
                })
            })
            .catch((req) => {
                console.log('User create error (', req.error.details, ')', req.error.message);
                logServerError(res, req.error, 'User Create Error')
                db.query(`DELETE FROM user_profile
                        WHERE userID = '${req.userData.userID}'`,
                    (error) => {
                        console.log('User Clean up Success')
                    })
            })
    });

    app.get('/auth/login', (req, res) => {

        if (req.headers.authorization) {

            promiseCollection.logInPromise(req)
                .then(Auth.clientEncode) /////////////////////////////////////
                .then(Auth.checkUP)
                .then(Auth.logToken)
                .then((req) => {
                    res.json({
                        'message': 'Logged in succesfully',
                        'userToken': req.userData.userToken
                    })
                })
                .catch((error) => {
                    console.log('Log in error (', error.details, ')', error);
                    logServerError(res, error, "Login Error")
                })


        } else {
            logUserError(res, "no credentials provided", 403)
        }

    });

    app.get('/auth/getUserProfile', Auth.checkToken, (req, res) => {
        db.query(`SELECT *
                FROM user_profile
                WHERE userID = '${req.userData.userID}' `, function (error, result) {
            if (error) {
                logServerError(res, error, "Get User Error")
            } else if (result[0]) {
                delete result[0].userID
                res.status(200).json({
                    "message": "Profile Fetches Succesfully",
                    "userProfile": result[0]
                })
            } else {
                logUserError(res, "No User Found", 404)
            };

        });
    });
    /////////////////// nuke all of this
    app.get('/changeWantedTags', Auth.checkToken, (req, res) => {
        req.db = db;
        changeWantedTags(req)
            .then((req) => {
                res.json({
                    "message": 'Wanted Tags Changed Successfully'
                })
            })
            .catch((req) => {
                console.log('Tag Change Error (', req.error.details, ')', req.error.message);
                res.status(500).json({
                    "message": 'Server Error',
                    "error": req.error
                })
            })
    });

    //////////////////////////////////////////////////////////////////////////  LISTINGS
    //######################
    app.post('/createListing', Auth.checkToken, (req, res) => {
        req.db = db;
        Auth.genID((idOne) => {
            var {
                title,
                body,
                end_date,
                location,
                itemList,
                mainPhoto
            } = req.body

            var listingID = idOne
            var authorID = req.userData.userID

            db.query(`INSERT INTO listing
            (listingID, authorID, title, body, mainPhoto, end_date, location)
VALUES ('${listingID}','${authorID}','${title}','${body}','${mainPhoto}','${end_date}','${location}')`,
                (error) => {
                    if (error) {
                        logServerError(res, error)
                    } else {

                        db.query(`INSERT INTO listing_item (itemID, listingID, name, description, tags, images) VALUES ${genSQLFromItemList(itemList)}`, (error) => {
                            if (error) {
                                logServerError(res, error, 'Listing Item Save Error')
                            } else {
                                console.log('Listing Saved Successfully')
                                res.json({
                                    "message": 'Listing Saved Successfully',
                                    "Data": listingID
                                })
                            }

                        })
                    }
                }
            )
        })




    });

    //######################
    app.get('/getListingNoAuth', (req, res) => {
        req.db = db
        promiseCollection.getListing(req)
            .then(promiseCollection.getListingItems)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "Data": req.listing
                })
            })
            .catch((req) => {
                logServerError(res, error, "Listing Could not be Fetched")
            })
    });

    //######################
    app.get('/getListingAuthenticated', Auth.checkToken, (req, res) => {
        req.db = db
        promiseCollection.getListing(req)
            .then(promiseCollection.getListingItems)
            .then(promiseCollection.saveViewRequest)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "Data": req.listing
                })
            })
            .catch((req) => {
                logServerError(res, req.error, "Listing Fetch Error")
                console.log('Listing Fetch Error (', req.error.details, ')', req.error.message);
            })
    });

    //////////////// construciton zone
    app.get('/getFrontPageListings', (req, res) => {
        ////////////////// save a view as a date, prune views older than 24 hrs
        ////////////////// return most viewed in 24 hrs

    });

    app.get('/getFilteredListings', (req, res) => {
        //////////////////////////////// WIP
        db.query(`SELECT *
            FROM listing
            WHERE 
            LIKE
            IN `,
            (error, results) => {
                console.log(`(${req.body.filterTags})`)
                if (error) {
                    logServerError(res, error, 'Filter listing error')
                } else {
                    console.log('Filtered Results Sent Succesfully')
                    res.json({
                        "message": 'Filtered Results Fetched Succesfully',
                        "Data": results
                    })
                }
            })
    });
    /////////////////
    //######################
    app.get('/getRecentListings', Auth.checkToken, (req, res) => {
        db.query(`SELECT *
    FROM listing
    RIGHT JOIN
    (SELECT *
        FROM view_log
        ORDER BY view_date DESC
        LIMIT 10
        ) AS top10
    ON listing.listingID = top10.listingID
    WHERE userID = '${req.userData.userID}'
    `, (error, results) => {
            if (error) {
                logServerError(res, error, "Recent Listing Error")
            } else {
                console.log('Recent Listings Sent Successfully')
                res.json({
                    "message": 'Recent Listings Fetched Succesfully',
                    "Data": results
                })
            }
        })
    });

    //######################
    app.get('/getDesiredItems', (req, res) => {
        db.query(`SELECT * FROM wanted_tags`, (error, results) => {
            if (error) {
                console.log('Get Desired Items Error: ', error)
                logServerError(res, error, "Desired Items Fetch Error")
            } else {
                res.json({
                    "message": 'Desired Items Fetched Succesfully',
                    "Datat": results
                })
            }
        });
    })

    //////////////////////////////////////////////////////////////////////////  MESAGES

    app.post('/sendMessage', Auth.checkToken, (req, res) => {
        Auth.genID((messageID) => {
            db.query(`INSERT INTO message_history
(messageID,senderID,targetID,title,body,time_sent)
VALUES (${messageID},${req.userData.userID},${req.body.targetID},${req.body.title},${req.body.body},${new Date})`, (error, results) => {
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
                logServerError(res, error, 'Message Fetch Error')
            } else if (results[0]) {
                console.log('User Messages Fetched Successfully')
                res.json({
                    "message": 'Messages Fetched Succesfully',
                    "Data": results
                })
            } else {
                logUserError(res, 'No Messages Found', 400)
            }
        })
    });





};