const customLog = require('../../helpers/CustomLogs')   // import custom logger
const listingPromises = require('./ListingsPromises')   // import listing promisses
const imagePromises = require('../Images/imagePromises')    // import image promises
const tagPruner = require('../../helpers/tagPruner')    // import tag pruner
const Auth = require('../../helpers/AuthenticationHelper')  // import authentication helper

//calculates the ammount of items to skip sending
var calculatePageOffset = (itemsPerPage, pageNumber) => {
    if (!pageNumber || !Number.isInteger(pageNumber)) {
        pageOffset = 1
    
    } else {
        pageOffset = pageNumber
    }

    return (pageOffset - 1) * itemsPerPage

}

// adds page offset and listings per page to req
var addPageOffsetToReq = (req,res,next) => {

    // checks if the client has provided the number of listings to load per page
    req.listingsPerPage = req.query.listingsPerPage ?  parseInt(req.query.listingsPerPage) : 10

    // checks if the client has provided a page nuumber to load
    pageNum = req.query.pageNum ? req.query.pageNum : 0

    //calculates the ammount of items to skip sending
    req.pageOffset = calculatePageOffset(req.listingsPerPage, req.query.pageNum)

    next()
}

module.exports = function (app, db) {

    // create a new listing
    app.post('/auth/createListing', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Creating Listing")

        // append the databse connection to the req object
        req.db = db
        
        // log body value
        customLog.incomingData(req.body,"body")

        listingPromises.insertMainListing(req)
            .then(listingPromises.insertListingItems)
            .then(listingPromises.insertImageIds)
            .then(listingPromises.insertNewTags)
            .then(listingPromises.replaceTagsWithIDs)
            .then(listingPromises.insertItemTags)
            .then(listingPromises.logListingView)
            .then((req) => {
                customLog.values(req.userData.listingID,"ListingID")

                // send data to client
                customLog.sendJson(res, {
                    "message": 'Listing Saved Successfully',
                    "listingID": req.query.listingID
                })

                
            })
            .catch((error) => {
                // if inserting a listing fails
                // the inserted listing data is erased

                listingPromises.deleteListing(req)
                    .then(customLog.sendServerError(res, error, error.message))
                    .catch((error) => {
                        customLog.sendServerError(res, error, "Listing Cleanup Error")
                    })
            })
    });

    // fetch a listing without authentication
    app.get('/getListing', (req, res) => {
        customLog.connectionStart("Getting Listing no Auth")
        customLog.incomingData(req.query.listingID,"listing ID")

        // checks if the client proided a listing id to fetch
        if(req.query.listingID){
            // append the databse connection to the req object
            req.db = db

            // log body value
            customLog.incomingData(req.body,"body")

            listingPromises.getListing(req)
                .then(listingPromises.getListingItems)
                // .then(listingPromises.getListingItemTags)
                .then(listingPromises.atachImageIds)
                .then((req) => {

                    // send data to client
                customLog.sendJson(res, {
                        "message": 'Listing Fetched ',
                        "listing": req.listing
                    })

                })
                .catch((error) => {
                    customLog.sendServerError(res, error, "Listing Could not be Fetched")
                })

        } else {
            // if no listing id is provided
            customLog.sendUserError(res,"listing id is not defined",404)
        }
    });

    // fetch a listing with authentication
    app.get('/auth/getListing', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Getting Listing Auth")
        customLog.incomingData(req.query.listingID,"listing ID")

        // check if client provided a listing id
        if(req.query.listingID){
            // append the databse connection to the req object
            req.db = db
            
            listingPromises.getListing(req)
                .then(listingPromises.getListingItems)
                // .then(listingPromises.getListingItemTags)
                .then(listingPromises.atachImageIds)
                .then(listingPromises.logListingView)
                .then((req) => {

                    // send data to client
                customLog.sendJson(res, {
                        "message": 'Listing Fetched ',
                        "listing": req.listing
                    })

                })
                .catch((error) => {
                    customLog.sendServerError(res, error, "Listing Fetch Error")
                })

        } else {
            // if no listing id is provided
            customLog.sendUserError(res,"listing id is not defined",404)
        }
    });

    // reserve listing items for a user
    app.post('/auth/reserveItems', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Reserving Items")

        // checks if the request contains a list of items to reserve with at least one item
        if (req.query.listingItemIDList && req.query.listingItemIDList[0]) { 
            customLog.incomingData(req.query)
            
            // creates a list of item ids to reserve
            itemsToReserve = req.query.listingItemIDList.map(item => {return JSON.parse(item).itemID})
            
            customLog.incomingData(itemsToReserve,"items to reserve")
            
            let sql = `UPDATE listing_item SET isAvailable = 0
                        WHERE listingItemID IN ?`

            // query the database
            db.query(sql,[[itemsToReserve]], error => {
                if (error) {
                    customLog.sendServerError(res ,error, error.message)

                } else {
                    // send data to client
                customLog.sendJson(res, {
                        "message": 'Items Reserved',
                    })
                }
            })

        } else {
            customLog.sendUserError(res,"No Items to Reserve")
        }
    })

    // fetch all listings of a user
    app.get("/getUserListings", (req, res) => {
        customLog.connectionStart("Fetching User Listings")
        customLog.incomingData(req.query.userID,"user ID")

        let sql = `SELECT * FROM listing
                    WHERE authorID = ?
                    ORDER BY post_date DESC`

        // query the database
        db.query(sql, req.query.userID, (error, results) => {
            if (error) {
                customLog.sendServerError(res, error, error.message)

            } else if (results[0]) {

                // converts sql boolean (1/0) to true/false boolean
                results = results.map((item) => {
                    item.isActive = item.isActive == '1' ? true : false
                    return item
                })
                
                // send data to client
                customLog.sendJson(res, {
                    'message': "User Listings Fetched",
                    'listings': results
                })
            } else {
                customLog.sendServerError(res, new Error('No Entries Exist'), "No Entries Exist")
            }
        })
    })

    // fetch the recently viewed listings of a user
    app.get('/auth/getRecentListings', Auth.checkToken, addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Recently Viewed Listings")
        customLog.incomingData(req.userData.userID,"user ID")

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

        // query the database
            db.query(sql, [req.pageOffset,req.listingsPerPage,req.userData.userID], (error, results) => {
            if (error) {
                customLog.sendServerError(res, error, "Recent Listing Error")

            } else {

                // convert sql bool to true false
                results = results.map((listing) => {
                    listing.isActive = listing.isActive == "1" ? true : false
                    return listing
                })

                // send data to client
                customLog.sendJson(res, {
                    "message": 'Recent Listings Fetched ',
                    "listings": results
                })
            }
        })
    });

    // fetch front page listings
    app.get('/getFrontPageListings', addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Front Page Listings")


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

        // query the database
        db.query(sql, [req.pageOffset, req.listingsPerPage], (error, results) => {
            if (error) {
                customLog.sendServerError(res, error, error.message)

            } else if (results[0]) {

                // convert sql bool to true false
                results = results.map((listing) => {
                    listing.isActive = listing.isActive == "1" ? true : false
                    return listing
                })                

                // if at least one result is found
                // send data to client
                customLog.sendJson(res, {
                    'message': "Front Page Listings Fetched",
                    'listings': results
                })

            } else {
                customLog.sendServerError(res, new Error('No Entries Exist'),'No Entries Exist')
            }
        })

    });

    // fetch listings filtered by a search query
    app.get('/getFilteredListings', addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Filtred Listings")
        customLog.incomingData(req.query.searchString,"search query")
        
        // separate the search string into individual words
        searchStringArray = req.query.searchString.split(" ")

        // convert each word to lowercase
        searchStringArray = searchStringArray.map((tag) => {return tag.toLowerCase()})

        // remoove any words that arent tags eg; the, or and and
        searchStringArray = tagPruner.pruneNonTagsFrom(searchStringArray)

        if (searchString == []) {

            customLog.sendUserError(res, "search cannot be empty", 404)

        } else {
            
            customLog.values(searchStringArray,"search tags")

        let sql = `
            SELECT * FROM listing WHERE listingID IN 
                (
                    SELECT listingID
                    FROM listing_item_tags
                    WHERE tagID
                    IN (
                        SELECT tagID FROM tags WHERE tagName IN ?
                        )
                    GROUP BY listingID
                    ORDER BY COUNT(listingID) DESC
                )
            ORDER BY isActive DESC LIMIT ?, ?;
            `
 
    
        // query the database
        db.query(sql, [[searchStringArray] ,req.pageOffset, req.listingsPerPage],
            (error, results) => {
                if (error) {
                    customLog.sendServerError(res, error, 'Filter listing error')

                } else {

                    // convert sql bool to true false
                results = results.map((listing) => {
                    listing.isActive = listing.isActive == "1" ? true : false
                    return listing
                })

                    // send data to client
                    customLog.sendJson(res, {
                        "message": 'Filtered Results Fetched ',
                        "listings": results
                    })

                }
            })

        }

        
    });

    // fetch listings created by a user
    app.get('/getUserListings', addPageOffsetToReq, () => {
        customLog.connectionStart("Fetching User Listings")
        customLog.incomingData(req.query.userID,"user ID")

        // append the database connection to the request object
        req.db = db

        listingPromises.getUserListings(req)
            .then((req) => {
                customLog.sendJson(req.res,{
                    "message" : "User Listings Fetched",
                    "listings" : req.listings
                })
            })
            .catch((error) => {
                customLog.sendServerError(res, error, error.message)
            })

    })

    // fetch a users recently viewed listings
    app.get('/auth/getRecentListings', Auth.checkToken, addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Recently Viewed Listings")
        customLog.incomingData(req.userData.userID,"user ID")

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

        // query the database
            db.query(sql, [req.pageOffset, req.listingsPerPage, req.userData.userID], (error, results) => {
            if (error) {
                customLog.sendServerError(res, error, "Recent Listing Error")

            } else {
                
                // convert sql bool to true false
                results = results.map((listing) => {
                    listing.isActive = listing.isActive == "1" ? true : false
                    return listing
                })

                // send data to client
                customLog.sendJson(res, {
                    "message": 'Recent Listings Fetched ',
                    "listings": results
                })
            }
        })
    });

    // fetches desired items
    app.get('/getDesiredItems', addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Desired Items")

        let sql = `SELECT * FROM tags
        JOIN (SELECT count(userID), tagID FROM wanted_tags
        GROUP BY tagID
        ORDER BY count(userID)) AS wantedTags ON tags.tagID = wantedTags.tagID
        LIMIT ?, ?`

        // query the database
            db.query(sql, [req.pageOffset, req.listingsPerPage], (error, results) => {
            if (error) {
                customLog.sendServerError(res, error, "Desired Items Fetch Error")

            } else {
                
                // send data to client
                customLog.sendJson(res, {
                    "message": 'Desired Items Fetched',
                    "tags": results
                })
            }
        });
    });

    // delete a listing
    app.delete('/auth/deleteListing', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Deleting Listing")

        // appends the databse connection to the request object
        req.db = db

        // body.listingID

        listingPromises.checkUserIsAuthor(req)
            .then(imagePromises.fetchImageIDs)
            .then(imagePromises.deleteImages)
            .then(listingPromises.deleteListing)
            .then(() => {
                // send data to the client
                res.send({"message": "Listing  Deleted" })
            })
            .catch((error) => { customLog.sendServerError(res, error, error.message) })
    });
}