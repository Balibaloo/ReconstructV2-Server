const customLog = require('../../helpers/CustomLogs')   // import custom logger
const listingPromises = require('./ListingsPromises')   // import listing promisses
const imagePromises = require('../Images/imagePromises')    // import image promises
const tagPruner = require('../../helpers/tagPruner')    // import tag pruner
const Auth = require('../../helpers/AuthenticationHelper')  // import authentication helper

//calculates the ammount of items to skip sending
var calculatePageOffset = (itemsPerPage, pageNumber) => {

    if (!pageNumber || !pageNumber) {
        pageOffset = 0

    } else {
        pageOffset = pageNumber
    }

    return pageOffset * itemsPerPage

}

// adds page offset and listings per page to req
var addPageOffsetToReq = (req, res, next) => {

    // checks if the client has provided the number of listings to load per page
    req.listingsPerPage = req.query.listingsPerPage ? parseInt(req.query.listingsPerPage) : 10

    // checks if the client has provided a page nuumber to load
    pageNum = req.query.pageNum ? req.query.pageNum : 0

    //calculates the ammount of items to skip sending
    req.pageOffset = calculatePageOffset(req.listingsPerPage, pageNum)

    customLog.values(req.query.pageNum,"page number")
    customLog.values(req.listingsPerPage,"listings per page")
    customLog.values(req.pageOffset,"page offset")

    next()
}

module.exports = function (app, db) {

    // create a new listing
    app.post('/auth/createListing', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Creating Listing")

        // append the databse connection to the req object
        req.db = db

        // log body value
        customLog.incomingData(req.body, "body")

        listingPromises.insertMainListing(req)
            .then(listingPromises.insertListingItems)
            .then(listingPromises.insertImageIds)
            .then(listingPromises.insertNewTags)
            .then(listingPromises.replaceTagsWithIDs)
            .then(listingPromises.insertItemTags)
            .then(listingPromises.insertListingTags)
            .then(listingPromises.logListingView)
            .then((req) => {
                customLog.values(req.userData.listingID, "ListingID")

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
        customLog.incomingData(req.query.listingID, "listing ID")

        // checks if the client proided a listing id to fetch
        if (req.query.listingID) {
            // append the databse connection to the req object
            req.db = db

            // log body value
            customLog.incomingData(req.body, "body")

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
            customLog.sendUserError(res, "listing id is not defined", 404)
        }
    });

    // fetch a listing with authentication
    app.get('/auth/getListing', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Getting Listing Auth")
        customLog.incomingData(req.query.listingID, "listing ID")

        // check if client provided a listing id
        if (req.query.listingID) {
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
            customLog.sendUserError(res, "listing id is not defined", 404)
        }
    });

    // reserve listing items for a user
    app.post('/auth/reserveItems', Auth.checkToken, (req, res) => {
        customLog.connectionStart("Reserving Items")

        // checks if the request contains a list of items to reserve with at least one item
        if (req.query.listingItemIDList && req.query.listingItemIDList[0]) {
            customLog.incomingData(req.query)

            // creates a list of item ids to reserve
            req.query.itemsToReserve = req.query.listingItemIDList.map(item => { return JSON.parse(item).itemID })

            customLog.incomingData(itemsToReserve, "items to reserve")

            req.db = db

            listingPromises.reserveItems(req)
                .then(() =>
                    customLog.sendJson(res, {
                        "message": 'Items Reserved',
                    }))
                .catch(error => customLog.sendServerError(res, error, error.message))


        } else {
            customLog.sendUserError(res, "No Items to Reserve")
        }
    })

    // fetch front page listings
    app.get('/getFrontPageListings', addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Front Page Listings")

        req.db = db
        listingPromises.getFrontPageListings(req)
            .then(req =>
                // send data to client
                customLog.sendJson(res, {
                    "message": req.message,
                    "listings": req.listings
                }))
            .catch(error => customLog.sendServerError(res, error, error.message))


    });

    // fetch listings filtered by a search query
    app.get('/getFilteredListings', addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Filtred Listings")
        customLog.incomingData(req.query.searchString, "search query")

        // separate the search string into individual words
        searchStringArray = req.query.searchString.split(" ")

        // convert each word to lowercase
        searchStringArray = searchStringArray.map((tag) => { return tag.toLowerCase() })

        // remoove any words that arent tags eg; the, or and and
        req.query.searchStringArray = tagPruner.pruneNonTagsFrom(searchStringArray)


        if (req.query.searchStringArray.length == 0) {

            customLog.sendUserError(res, "search cannot be empty", 404)

        } else {
            req.db = db
            customLog.values(req.query.searchStringArray, "search tags")

            listingPromises.getFilteredListings(req)
                .then(results => 
                    // send data to client
                    customLog.sendJson(res, {
                        "message": req.message,
                        "listings": req.listings
                    }))
                .catch(error => customLog.sendServerError(res, error, 'Filter listing error'))

        }


    });

    // fetch listings created by a user
    app.get('/getUserListings', addPageOffsetToReq, (req,res) => {
        customLog.connectionStart("Fetching User Listings")
        customLog.incomingData(req.query.userID, "user ID")

        // append the database connection to the request object
        req.db = db

        listingPromises.getUserListings(req)
            .then((req) => {
                customLog.sendJson(req.res, {
                    "message": req.message,
                    "listings": req.listings
                })
            })
            .catch((error) => {
                customLog.sendServerError(res, error, error.message)
            })

    })

     // fetch the recently viewed listings of a user
     app.get('/auth/getRecentListings', Auth.checkToken, addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Recently Viewed Listings")
        customLog.incomingData(req.userData.userID, "user ID")
        
        req.db = db
        listingPromises.getRecentlyViewedListings(req)
            .then(req =>
                // send data to client
                customLog.sendJson(res, {
                    "message": req.message,
                    "listings": req.listings
                }))
            .catch(error => customLog.sendServerError(res, error, "Recent Listing Error"))
    });

    // fetches desired items
    app.get('/getDesiredItems', addPageOffsetToReq, (req, res) => {
        customLog.connectionStart("Fetching Desired Items")
        
        req.db = db
        listingPromises.getDesiredItems(req)
            .then(results => 
                // send data to client
                customLog.sendJson(res, {
                    "message": 'Desired Items Fetched',
                    "tags": results
                }))
                .catch(error => customLog.sendServerError(res, error, "Desired Items Fetch Error"))
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
                res.send({ "message": "Listing  Deleted" })
            })
            .catch((error) => { customLog.sendServerError(res, error, error.message) })
    });
}