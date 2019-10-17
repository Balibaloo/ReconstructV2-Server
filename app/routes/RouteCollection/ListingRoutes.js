const customErrorLogger = require('../../helpers/CustomErrors')
const promiseCollection = require('../../helpers/promises');
const Auth = require('../../helpers/AuthenticationHelper');
const sqlBuilder = require('sql')

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

module.exports.routes = function (app, db) {

    app.post('/createListing', Auth.checkToken, (req, res) => {
        req.db = db;

        /// need to save images sent to server, and replace them with their ids
        promiseCollection.insertMainListing(req)
            .then(promiseCollection.insertListingItems)
            .then(promiseCollection.insertImageIds)
            .then(promiseCollection.insertItemTags)
            .then((req) => {
                res.json({
                    "message": 'Listing Saved Successfully',
                    "Data": req.listingIDs
                })
            })
            .then(console.log('Listing Saved sucsessfully'))
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error ? req.error : req)
                promiseCollection.deleteListing(req)
                    .then(console.log('succesfully cleaned up'))
                    .catch((req) => {
                        customErrorLogger.logServerError(res, req.error, "Cleanup Error")
                    })
            })
    });

    app.get('/getListingNoAuth', (req, res) => {
        req.db = db
        promiseCollection.getListing(req)
            .then(promiseCollection.getListingItems)
            .then(promiseCollection.getListingItemTags)
            .then(promiseCollection.getListingItemImages)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "Data": req.listing
                })
            })
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error, "Listing Could not be Fetched")
            })
    });

    app.get('/getListingAuthenticated', Auth.checkToken, (req, res) => {
        req.db = db

        /// need to replace image ids with loaded images

        promiseCollection.getListing(req)
            .then(promiseCollection.getListingItems)
            .then(promiseCollection.getListingItemTags)
            .then(promiseCollection.getListingItemImages)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "Data": req.listing
                })
            })
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error, "Listing Fetch Error")
                console.log('Listing Fetch Error (', req.error.details, ')', req.error.message);
            })
    });

    //#########################################################################
    app.get('/getFrontPageListings', (req, res) => {
        ////////////////// save a view as a date, prune views older than 24 hrs
        ////////////////// return most viewed in 24 hrs

    });

    app.get('/getFilteredListings', (req, res) => {
        searchStringArr = req.body.searchString.split(" ")

        db.query(`SELECT * FROM listing WHERE listingID IN (SELECT DISTINCT listingID
            FROM listing_item_tags
            WHERE tagID IN ${arrayToSQL(req.body.filterTags)})`,
            (error, results) => {
                if (error) {
                    customErrorLogger.logServerError(res, error, 'Filter listing error')
                } else {
                    console.log('Filtered Results Sent Succesfully')
                    res.json({
                        "message": 'Filtered Results Fetched Succesfully',
                        "Data": results
                    })
                }
            })
    });

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
                customErrorLogger.logServerError(res, error, "Recent Listing Error")
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
        ///// fucken sql dont work
        db.query(`SELECT count(tagID), tagID FROM wanted_tags
                GROUP BY tagID
                JOIN tags ON tags.tagID = wanted_tags.tagID`, (error, results) => {
            if (error) {
                console.log('Get Desired Items Error: ', error)
                customErrorLogger.logServerError(res, error, "Desired Items Fetch Error")
            } else {
                res.json({
                    "message": 'Desired Items Fetched Succesfully',
                    "Data": results
                })
            }
        });
    });
}