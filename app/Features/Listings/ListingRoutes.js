const customErrorLogger = require('../../helpers/CustomErrors')
const listingPromises = require('./ListingsPromises')
const Auth = require('../Authentication/AuthenticationHelper');
const imagePromises = require('../Images/imagePromises')
const intToBoolScraper = require('../../helpers/intToBool');
const DEBUG = require("../../../StartServer").DEBUG



var getSQLPageOffset = (itemsPerPage, pageNumber) => {
    if (!pageNumber || !Number.isInteger(pageNumber)) {
        pageOffset = 1
    } else {
        pageOffset = pageNumber
    }

    return (pageOffset - 1) * itemsPerPage

}

var sendJson = (res,debug,body) => {
    if (debug.json) {
        console.log(body)
    }
    res.json(body)

}

module.exports = function (app, db) {

    app.post('/auth/createListing', Auth.checkToken, (req, res) => {
        req.db = db;

        console.log(req.body)

        listingPromises.insertMainListing(req)
            .then(listingPromises.insertListingItems)
            .then(listingPromises.insertImageIds)
            .then(listingPromises.insertNewTags)
            .then(listingPromises.replaceTagsWithIDs)
            .then(listingPromises.insertItemTags)
            .then(listingPromises.insertListingVisit)
            .then((req) => {
                console.log('Listing Saved sucsessfully')
                if (DEBUG.values) {console.log("ListingID = " + req.userData.listingID)}
                sendJson(res, DEBUG,{
                    "message": 'Listing Saved Successfully',
                    "listingID": req.userData.listingID
                })
            })
            .catch((error) => {
                listingPromises.deleteListing(req)
                    .then(customErrorLogger.logServerError(res, error,))
                    .then(console.log('succesfully cleaned up'))
                    .catch((err) => {
                        customErrorLogger.logServerError(res, err, "Cleanup Error")
                    })
            })
    });

    app.get('/getListingNoAuth', (req, res) => {

        if (DEBUG.debug){console.log("=====GET LISTING NO AUTH=====")}

        if(!req.query.listingID){
            customErrorLogger.logUserError(res,"listing id is not defined",404)
        } else {

        req.db = db
        listingPromises.getListing(req)
            .then(listingPromises.getListingItems)
            .then(listingPromises.getListingItemTags)
            .then(listingPromises.atachImageIds)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                sendJson(res,DEBUG,{
                    "message": 'Listing Fetched Succesfully',
                    "listing": intToBoolScraper.intToBool(req.listing)
                })
            })
            .catch((err) => {
                customErrorLogger.logServerError(res, err, "Listing Could not be Fetched")
            })
        }
    });

    app.get('/auth/getListing', Auth.checkToken, (req, res) => {
        req.db = db

        if (DEBUG.debug){console.log("=====GET LISTING AUTH=====")}
        if (DEBUG.values){console.log("userID = " + req.userData.userID)}

        listingPromises.getListing(req)
            .then(listingPromises.getListingItems)
            .then(listingPromises.getListingItemTags)
            .then(listingPromises.atachImageIds)
            .then(listingPromises.saveViewRequest)
            .then((req) => {
                console.log('Listing Fetched Successfully')
                sendJson(res, DEBUG,{
                    "message": 'Listing Fetched Succesfully',
                    "listing": intToBoolScraper.intToBool(req.listing)
                })
            })
            .catch((error) => {
                customErrorLogger.logServerError(res, error, "Listing Fetch Error")
            })
    });

    app.post('/auth/reserveItems', Auth.checkToken, (req, res) => {
        if (req.query.listingItemIDList && req.query.listingItemIDList[0])

        console.log(req.query)

        itemsToReserve = req.query.listingItemIDList.map(item => {return JSON.parse(item).itemID})
        
        if (DEBUG.values) {
            console.log("items to reserve : \n" ,  itemsToReserve)
        }
         
        let sql = `UPDATE listing_item SET isAvailable = 0
                    WHERE listingItemID IN ?`

        db.query(sql,[[itemsToReserve]], error => {
            if (error) {
                customErrorLogger.logServerError(res ,error)
            } else {
                sendJson(res, DEBUG,{
                    "message": 'Items Reserved Succesfully',
                })
            }
        })

    })

    app.get("/getUserListings", (req, res) => {

        let sql = `SELECT * FROM listing
                    WHERE authorID = ?
                    ORDER BY post_date DESC`

        db.query(sql, req.query.userID, (error, results) => {
            if (error) {
                customErrorLogger.logServerError(res, error, error.message)
            } else if (results[0]) {
                results = results.map((item) => {
                    item.isActive = item.isActive == '1' ? true : false
                    return item
                })
                console.log("User Listings sent succesfully")
                sendJson(res, DEBUG,{
                    'message': "Fetched Succefully",
                    'listings': intToBoolScraper.intToBool(results)
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
                sendJson(res, DEBUG,{
                    "message": 'Recent Listings Fetched Succesfully',
                    "listings": intToBoolScraper.intToBool(results)
                })
            }
        })
    });

    app.get('/getFrontPageListings', (req, res) => {
        // checks if user has provided an integer page number to load
        const listingsPerPage = 10;
        pageNum = req.query.pageNum ? req.query.pageNum : 0
        let pageOffset = getSQLPageOffset(listingsPerPage, req.query.pageNum)

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
                console.log("Front page Listings sent succesfully")
                sendJson(res,DEBUG,{
                    'message': "Fetched Succefully",
                    'listings': intToBoolScraper.intToBool(results)
                })
            } else {
                customErrorLogger.logServerError(res, new Error('No Entries Exist'))
            }
        })

    });

    app.get('/getFilteredListings', (req, res) => {
        const listingsPerPage = 10
        let pageOffset = getSQLPageOffset(listingsPerPage, req.query.pageNum)
        
        searchStringArray = req.query.searchString.split(" ")
        searchStringArray = searchStringArray.map((tag) => {return tag.toLowerCase()})
        searchStringArray = listingPromises.pruneNonTagsFrom(searchStringArray)


        let sql = `SELECT * FROM listing WHERE listingID IN (SELECT DISTINCT listingID
            FROM listing_item_tags
            WHERE tagID
            IN (SELECT tagID FROM tags WHERE tagName IN ? )) ORDER BY isActive DESC LIMIT ?, ?`

        db.query(sql, [[searchStringArray] ,pageOffset, listingsPerPage],
            (error, results) => {
                if (error) {
                    customErrorLogger.logServerError(res, error, 'Filter listing error')
                } else {
                    console.log('Filtered Results Sent Succesfully')
                    sendJson(res,DEBUG,{
                        "message": 'Filtered Results Fetched Succesfully',
                        "listings": intToBoolScraper.intToBool(results)
                    })
                }
            })
    });

    app.get('/auth/getRecentListings', Auth.checkToken, (req, res) => {
        const listingsPerPage = req.query.listingsPerPage
        let pageOffset = getSQLPageOffset(listingsPerPage, req.query.pageNum)

        let sql = `SELECT *
        FROM listing
        RIGHT JOIN
        (SELECT *
            FROM view_log
            ORDER BY view_date DESC
            LIMIT ?,?
            ) AS top10
        ON listing.listingID = top10.listingID
        WHERE userID = ?`

        db.query(sql, [pageOffset, listingsPerPage, req.userData.userID], (error, results) => {
            if (error) {
                customErrorLogger.logServerError(res, error, "Recent Listing Error")
            } else {
                console.log('Recent Listings Sent Successfully')
                sendJson(res, DEBUG,{
                    "message": 'Recent Listings Fetched Succesfully',
                    "listings": intToBoolScraper.intToBool(results)
                })
            }
        })
    });

    app.get('/getDesiredItems', (req, res) => {
        const listingsPerPage = 10
        let pageOffset = getSQLPageOffset(listingsPerPage, req.query.pageNum)

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
                sendJson(res, DEBUG,{
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