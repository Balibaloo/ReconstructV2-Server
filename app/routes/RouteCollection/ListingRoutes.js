const customErrorLogger = require('../../helpers/CustomErrors')
const promiseCollection = require('../../helpers/promises');
const Auth = require('../../helpers/AuthenticationHelper');
const sqlBuilder = require('sql')

var arrayToSQL = (arr) => {
    //// converts an array to an SQL insertable format String
    finalString = ""
    arr.forEach((item, index) => {
        if (index !== 0) {
            finalString += ' ,'
        }
        finalString += `'${item}'`
    })
    return finalString

};

var pruneNonTagsfrom = (tagList) => {
    const tagsToFilter = []
    tagList = tagList.filter((value) => {
        if (value in tagsToFilter) {
            return false
        } else return true
    })
    return tagList
}

var getSQLPageOffset = (itemsPerPage, pageNumber) => {
    if (!pageNumber || !Number.isInteger(pageNumber)) {
        pageOffset = 1
    } else {
        pageOffset = pageNumber
    }

    return (pageOffset - 1) * itemsPerPage

}


module.exports.routes = function (app, db) {

    app.post('/auth/createListing', Auth.checkToken, (req, res) => {
        req.db = db;

        promiseCollection.insertNewTags(req)
        /// need to save images sent to server, and replace them with their ids
        promiseCollection.insertMainListing(req)
            .then(promiseCollection.insertListingItems)
            .then(promiseCollection.insertImageIds)
            .then(promiseCollection.insertNewTags)
            .then(promiseCollection.insertItemTags)
            .then((req) => {
                res.json({
                    "message": 'Listing Saved Successfully',
                    "body": req.listingID
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

    app.post('/auth/addListingtoWatchList', Auth.checkToken)

    app.post('/auth/removeListingfromWatchList', Auth.checkToken)

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
                    "body": req.listing
                })
            })
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error, "Listing Could not be Fetched")
            })
    });

    app.get('/auth/getListing', Auth.checkToken, (req, res) => {
        req.db = db

        /// need to replace image ids with loaded images

        promiseCollection.getListing(req)
            .then(promiseCollection.getListingItems)
            .then(promiseCollection.getListingItemTags)
            .then(promiseCollection.getListingItemImages)
            .then(promiseCollection.saveViewRequest)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "body": req.listing
                })
            })
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error, "Listing Fetch Error")
            })
    });

    app.get('/getFrontPageListings', (req, res) => {
        // checks if user has provided an integer page number to load
        const listingsPerPage = 10

        let pageOffset = getSQLPageOffset(listingsPerPage, req.body.pageNum)

        let sql = `SELECT * 
                FROM listing 
                JOIN (SELECT view_log.listingID, COUNT(view_log.viewID) AS numOfViews
                    FROM dataserver.view_log 
                    WHERE isRecent = 1 
                    GROUP BY view_log.listingID)
                AS topNumListings 
                ON listing.listingID = topNumListings.listingID
                ORDER BY numOfViews DESC
                LIMIT ?, ?
                `

        db.query(sql, [pageOffset, listingsPerPage], (error, results) => {
            if (error) {
                customErrorLogger.logServerError(res, error, error.message)
            } else if (results[0]) {
                results = results.map((item) => {
                    item.isActive = item.isActive == '1' ? true : false
                    return item
                })
                console.log("Front page Listings sent succesfully")
                res.json({
                    'message': "Fetched Succefully",
                    'body': results
                })
            } else {
                customErrorLogger.logServerError(res, new Error('No Entries Exist'))
            }
        })

    });

    app.get('/getFilteredListings', (req, res) => {
        const listingsPerPage = 10
        let pageOffset = getSQLPageOffset(listingsPerPage, req.body.pageNum)

        searchStringArr = req.body.searchString.split(" ")
        searchStringArr = pruneNonTagsfrom(searchStringArr)

        let sql = `SELECT * FROM listing WHERE listingID IN (SELECT DISTINCT listingID
            FROM listing_item_tags
            WHERE tagID 
            IN (SELECT tagID FROM tags WHERE tagName IN (${arrayToSQL(searchStringArr)}))) ORDER BY isActive DESC LIMIT ?, ?`

        db.query(sql, [pageOffset, listingsPerPage],
            (error, results) => {
                if (error) {
                    customErrorLogger.logServerError(res, error, 'Filter listing error')
                } else {
                    console.log('Filtered Results Sent Succesfully')
                    results = results.map((item) => {
                        item.isActive = item.isActive == 1 ? true : false
                        return item
                    })
                    res.json({
                        "message": 'Filtered Results Fetched Succesfully',
                        "body": results
                    })
                }
            })
    });

    app.get('/auth/getRecentListings', Auth.checkToken, (req, res) => {
        let sql = `SELECT *
        FROM listing
        RIGHT JOIN
        (SELECT *
            FROM view_log
            ORDER BY view_date DESC
            LIMIT 10
            ) AS top10
        ON listing.listingID = top10.listingID
        WHERE userID = ?`

        db.query(sql, req.userData.userID, (error, results) => {
            if (error) {
                customErrorLogger.logServerError(res, error, "Recent Listing Error")
            } else {
                console.log('Recent Listings Sent Successfully')
                results = results.map((item) => {
                    item.isActive = item.isActive == 1 ? true : false
                    return item
                })
                res.json({
                    "message": 'Recent Listings Fetched Succesfully',
                    "body": results
                })
            }
        })
    });

    app.get('/getDesiredItems', (req, res) => {
        const listingsPerPage = 10
        let pageOffset = getSQLPageOffset(listingsPerPage, req.body.pageNum)

        let sql = `SELECT * FROM tags
        JOIN (SELECT count(userID), tagID FROM wanted_tags
        GROUP BY tagID
        ORDER BY count(userID)) AS wantedTags ON tags.tagID = wantedTags.tagID
        LIMIT ?, ?`

        db.query(sql, [pageOffset, listingsPerPage], (error, results) => {
            if (error) {
                console.log('Get Desired Items Error: ', error)
                customErrorLogger.logServerError(res, error, "Desired Items Fetch Error")
            } else {
                console.log("Desired Items Fetched Succesfully")
                res.json({
                    "message": 'Desired Items Fetched Succesfully',
                    "body": results
                })
            }
        });
    });

}