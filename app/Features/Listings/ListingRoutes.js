const customErrorLogger = require('../../helpers/CustomErrors')
const listingPromises = require('./ListingsPromises')
const Auth = require('../Authentication/AuthenticationHelper');
const imagePromises = require('../Images/imageHandler')
const customQueue = require('../../helpers/romansQueue')

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

 exports = function (app, db) {

    app.post('/auth/createListing', Auth.checkToken, (req, res) => {
        req.db = db;

        /// need to save images sent to server, and replace them with their ids
        listingPromises.insertMainListing(req)
            .then(listingPromises.insertListingItems)
            .then(listingPromises.insertImageIds)
            .then(listingPromises.insertNewTags)
            .then(listingPromises.replaceTagsWithIDs)
            .then(listingPromises.insertItemTags)
            .then((req) => {
                console.log('Listing Saved sucsessfully')
                res.json({
                    "message": 'Listing Saved Successfully',
                    "listingID": req.listingID
                })
            })
            .catch((req) => {
                req.db = db
                listingPromises.deleteListing(req)
                    .then(customErrorLogger.logServerError(res, req.error ? req.error : req))
                    .then(console.log('succesfully cleaned up'))
                    .catch((req) => {
                        customErrorLogger.logServerError(res, req.error, "Cleanup Error")
                    })
            })
    });

    app.get('/getListingNoAuth', (req, res) => {
        req.db = db
        listingPromises.getListing(req)
            .then(listingPromises.getListingItems)
            .then(listingPromises.getListingItemTags)
            .then(listingPromises.getListingItemImages)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "listing": req.listing
                })
            })
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error, "Listing Could not be Fetched")
            })
    });

    app.get('/auth/getListing', Auth.checkToken, (req, res) => {
        req.db = db

        /// need to replace image ids with loaded images

        listingPromises.getListing(req)
            .then(listingPromises.getListingItems)
            .then(listingPromises.getListingItemTags)
            .then(listingPromises.getListingItemImages)
            .then(listingPromises.saveViewRequest)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                res.json({
                    "message": 'Listing Fetched Succesfully',
                    "listing": req.listing
                })
            })
            .catch((req) => {
                customErrorLogger.logServerError(res, req.error, "Listing Fetch Error")
            })
    });

    ///////////awfdawfwwawawafwafawWHTIHJEWIFH{AOIWHJTHIUS}THIS
    app.post('/auth/reserveItem',Auth.checkToken, (req,res) => {
        customQueue
    })

    app.get("/auth/getUserListings", Auth.checkToken, (req, res) => {

        let sql = `SELECT * FROM listing 
                    WHERE userID = ?
                    ORDER BY post_date DESC`

        db.query(sql, req.userData.userID, (error, results) => {
            if (error) {
                customErrorLogger.logServerError(res, error, error.message)
            } else if (results[0]) {
                results = results.map((item) => {
                    item.isActive = item.isActive == '1' ? true : false
                    return item
                })
                console.log("User Listings sent succesfully")
                res.json({
                    'message': "Fetched Succefully",
                    'listings': results
                })
            } else {
                customErrorLogger.logServerError(res, new Error('No Entries Exist'))
            }
        })
    })

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
                    "listings": results
                })
            }
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
                    'listings': results
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
                        "listings": results
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
                    "tags": results
                })
            }
        });
    });

    app.delete('/auth/deleteListing', Auth.checkToken, (req, res) => {
        req.db = db
        // body.listingID

        listingPromises.checkUserIsAuthor(req)
            .then(imagePromises.fetchImageIDs)
            .then(imagePromises.deleteImages)
            .then(listingPromises.deleteListing)
            .then(() => console.log("Listing Succesfully Deleted"))
            .then(() => res.send({
                "message": "Listing Succesfully Deleted"
            }))
            .catch((error) => { customErrorLogger.logServerError(res, error) })
    });

}