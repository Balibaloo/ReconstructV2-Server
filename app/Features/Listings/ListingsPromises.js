const Auth = require('../../helpers/AuthenticationHelper') // import authentication helper
const customLog = require('../../helpers/CustomLogs')   // import custom logger
const tagPruner = require('../../helpers/tagPruner')    // import tag pruner
const uniqueID = require('uniqid') // import id generator

//// Create A Listing
// insert a listing entry into the listing table
module.exports.insertMainListing = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("inserting main listing")

    // generate a new id for the listing
    Auth.genID((listingID) => {

        // destructure the request body into separate variables
        var {
            title,
            body,
            end_date,
            location_lat,
            location_lon,
            mainImageID
        } = req.body

        // add the listing id to the request object for future reference
        req.query.listingID = listingID


        // this value skips author == userid check for insert a view for a listing
        req.userData.fistView = true
        req.listing = {}
        req.listing.authorID = req.userData.userID

        // convert ISO standard date to SQL date
        end_date = end_date.replace("T", " ").replace("Z", "")

        // insert the data into the databse
        req.db.query(`INSERT INTO listing
        (listingID, authorID, title, body, mainImageID, location_lat, location_lon ,end_date)
        VALUES ?`, [[[listingID, req.userData.userID, title, body, mainImageID, location_lat, location_lon, end_date]]],
            (error) => {
                if (error) {
                    error.details = "main Save Error"
                    reject(error)

                } else {
                    customLog.prommiseResolved("Inserted Main Listing")
                    resolve(req)
                }
            }
        )
    })
})

// insert the listing items into the listing_items table
module.exports.insertListingItems = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("inserting listing items")

    // saves itemlist with new item ids for other functions
    req.body.itemList = req.body.itemList.map((item) => {
        // generate a new id for an item
        item.itemID = uniqueID()

        return item
    })

    // extracts data from the list of items to be inserted via SQL
    itemListToInsert = req.body.itemList.map((item) => {
        return [item.itemID, req.query.listingID, item.name, item.description]
    })

    const sql = `INSERT INTO listing_item (listingItemID, listingID, name, description) VALUES ?`

    // insert the items
    req.db.query(sql, [itemListToInsert], (error) => {
        if (error) {
            error.details = "item Save Error"
            reject(error)

        } else {
            customLog.prommiseResolved("Inserted Listing Items")
            resolve(req)
        }
    })
})

// insert image ids into the listing_item - item_image link table
module.exports.insertImageIds = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("inserting image ids")

    // initalise an empty array
    finalImageArray = []

    // for each image in every item, add an entry into the finalImageArray that contains an imageID itemID pair
    req.body.itemList.forEach((item) => {
        item.images.forEach((imageID) => { finalImageArray.push([imageID, item.itemID]) })
    })

    const sql = `INSERT INTO listing_item_images (imageID, listingItemID) VALUES ?`;

    // insert the imageID itemID links
    req.db.query(sql, [finalImageArray], (error) => {
        if (error) {
            error.details = "image Save Error"
            reject(error)

        } else {
            customLog.prommiseResolved("linked imageIDs <-> itemIDs")
            resolve(req)
        }
    })
});

// insert any tags that havent been inserted yet
module.exports.insertNewTags = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("inserting new tags")

    // every peice of text is used as a tag and then non keywords are filtered out of the tagList
    keywordList = getAllListingTags(req.body)

    // creating a set eliminates repeating tags    
    req.body.tagNameArray = Array.from(new Set(keywordList))

    // wraps every tag in an array so that the tag list is not treated as one entry in the database 
    let nestedTagArr = req.body.tagNameArray.map((item) => { return [item] })

    let sql = `INSERT IGNORE INTO tags (tagName) VALUES ? `

    // insert the tag if it is not already in the database
    req.db.query(sql, [nestedTagArr], (error, result) => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("Inserted New Tags")
            resolve(req)
        }
    })
})

// retreve all the tags from a listing
let getAllListingTags = (body) => {
    allText = ""

    // adds listing title and body into the allWords string
    allText += body.title + " " + body.body

    // adds item text to the allWords String
    body.itemList.forEach((item) => {
        allText += " " + getAllItemWords(item)
    })

    // splits the allText string into a list of all the tags in a listing
    return tagPruner.pruneNonTagsFrom(allText.split(" "))
}

// retreve all tags from a listing
let getOnlyListingTags = (body) => {
    allText = ""

    // adds listing title and body into the allWords string
    allText += body.title + " " + body.body

    // splits the allText string into a list of all the words in a listing
    return tagPruner.pruneNonTagsFrom(allText.split(" "))
}

// retreive all item text
let getAllItemWords = (item) => {
    return item.name + " " + item.description + " "
}

//  replace item tags with item ids
module.exports.replaceTagsWithIDs = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("replacing tags with ids")


    let sql = `SELECT * FROM tags WHERE tagName IN ?`

    // fetch tags and tag ids from the databse
    req.db.query(sql, [[req.body.tagNameArray]], (error, results) => {
        if (error) {
            reject(error)

        } else {
            // parses the results into a dictionary 
            req.body.tagNameIdDictionary = tagResultListToDicionary(results)


            // replaces the tags in each item with the ids of the tags
            // filters undefined tags
            req.body.itemList = req.body.itemList.map((item) => {

                item.tagList = getAllItemWords(item).split(" ").map((tagName) => {

                    // replace tag name with id
                    return req.body.tagNameIdDictionary[tagName]
                }).filter((tagID) => {

                    // checks if a tag id is defined
                    return tagID
                })
                return item
            })

            customLog.prommiseResolved("Replaced Tag names with tagIDs")
            resolve(req)
        }
    })
});

// insert item <-> tag links into the link table
module.exports.insertItemTags = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("inserting tag <--> item")

    finalDataArray = []

    // adds tagID,itemID and listingID to an array to be inserted into the database
    req.body.itemList.forEach((item) => {
        item.tagList.forEach((tagID) => { finalDataArray.push([tagID, item.itemID, req.query.listingID]) })
    })

    let sql = `INSERT INTO listing_item_tags (TagID,listingItemID,listingID) VALUES ?`

    // insert data into the listing_item_tags table
    req.db.query(sql, [finalDataArray], (error) => {
        if (error) {
            error.details = "tag item Save Error"
            reject(error)

        } else {
            customLog.prommiseResolved("Inserted Item <-> Tags")
            resolve(req)
        }
    })
})

// insert listing <-> tag links into the link table
module.exports.insertListingTags = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("inserting tag <--> listing")

    finalDataArray = []
    listingTags = getOnlyListingTags(req.body)


    // adds tagID,itemID and listingID to an array to be inserted into the database
    listingTags.forEach((tagName) => { finalDataArray.push([req.body.tagNameIdDictionary[tagName], req.query.listingID]) })

    let sql = `INSERT INTO listing_item_tags (TagID,listingID) VALUES ?`

    // insert data into the listing_item_tags table
    req.db.query(sql, [finalDataArray], (error) => {
        if (error) {
            error.details = "tag listing Save Error"
            reject(error)

        } else {
            customLog.prommiseResolved("Inserted Listing <-> Tags")
            resolve(req)
        }
    })
})


module.exports.reserveItems = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("reserving listing items")

    let sql = `UPDATE listing_item SET isAvailable = 0
                        WHERE listingItemID IN ?`

    // query the database
    req.db.query(sql, [[req.query.itemsToReserve]], error => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("items reserved")
            resolve()
        }
    })

})

// convert a list of tag-id pairs into a dictionary of tags and their ids 
var tagResultListToDicionary = (tagDataList) => {
    returnDictionary = {}

    // pair the tag id and name in the dictionary
    tagDataList.forEach((item) => {
        returnDictionary[item.tagName] = item.tagID
    })

    return returnDictionary
};

// logs a visit to a listing into the view_log
module.exports.logListingView = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("loging listing view")

    // check that the client is not the author of the listing
    if (req.userData.userID != req.listing.authorID || req.userData.fistView) {

        // generate an id for the visit
        Auth.genID((viewID) => {

            let sql = "INSERT INTO view_log (viewID,userID,listingID) VALUES ?"

            // insert the view
            req.db.query(sql, [[[viewID, req.userData.userID, req.query.listingID]]], (error) => {
                if (error) {
                    error.details = "logging view to listing"
                    reject(error)

                } else {
                    customLog.prommiseResolved("logged view request")
                    resolve(req)
                }
            })
        })

    } else {
        resolve(req)
    }
})


//// Fetch A Listing
// retreives a Listing entry from databse given listingID
module.exports.getListing = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("fetching listing")

    // query the database
    req.db.query(`SELECT *
                FROM listing
                WHERE listingID = ?`, [req.query.listingID], (error, results) => {

        if (error) {
            error.details = 'fetch main listing'
            reject(error)

        } else if (results[0]) {
            // if one or more entries exist

            // retreives the first listing found
            req.listing = results[0]

            // converts sql boolean to true/false
            req.listing.isActive = req.listing.isActive == 1 ? true : false

            customLog.prommiseResolved("Fetched Main Listing")
            resolve(req)

        } else {
            error = new Error('no listing found')
            error.details = 'no listing found, id = ' + req.query.listingID
            reject(error)
        }

    })
});


// retreives every listing_item associated with a listingID
module.exports.getListingItems = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("fetching listing items")

    let sql = `SELECT *
    FROM listing_item WHERE listingID = ?
    `

    // execute sql
    req.db.query(sql, [req.query.listingID], (error, results) => {
        if (error) {
            error.details = 'listing fetch error'
            reject(error)

        } else if (results[0]) {
            // if at least one item is found

            // convert sql boolean to true/false
            results = results.map((item) => {
                try {
                    item.isAvailable = item.isAvailable == 1 ? true : false
                } catch (error) {
                    console.log("bool convertion on items failed")
                    console.log(error)
                }

                return item
            })


            req.listing.itemList = results
            customLog.prommiseResolved("Fetched Listing Items")
            resolve(req)

        } else {
            error = new Error('no listing items found')
            reject(error)
        }
    })

});

// atatches image ids to items
module.exports.atachImageIds = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("ataching image ids")

    let sql = `SELECT imageID,listingItemID 
    FROM listing_item_images 
    WHERE listingItemID 
    IN (SELECT listingItemID
        FROM listing_item
        WHERE listingID = ? )`

    // execute SQL
    req.db.query(sql, [req.listing.listingID], (error, result) => {
        if (error) {
            reject(error)

        } else if (result[0]) {
            // if at least one image is found

            // for every item in the listing
            req.listing.itemList.forEach(item => {

                item.imageArray = []

                // for every image in results
                result.forEach((ImageListingIDs) => {
                    if (item.listingItemID == ImageListingIDs.listingItemID) {
                        // if the image belongs to the item
                        // add it to the imageID list of the item
                        item.imageArray.push(ImageListingIDs.imageID)
                    }
                })
            })
            customLog.prommiseResolved("images attatched")
            resolve(req)
        }
    })
})

// fetch the listings created by a user
module.exports.getUserListings = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("fetching user listings")

    const sql = `SELECT *
    FROM listing
    WHERE authorID = ?
    ORDER BY post_date DESC
    LIMIT ? OFFSET ?`

    // execute SQL
    req.db.query(sql, [req.query.userID, req.listingsPerPage, req.pageOffset], (error, results) => {
        if (error) {
            error.details = 'select listing'
            reject(error)

        } else if (results[0]) {
            // if a single listing is found

            // convert SQL boolean to true/false
            req.listings = results.map((listing) => {
                listing.isActive = listing.isActive == 1 ? true : false
                return listing
            })
            req.message = "User Listings Fetched"

            customLog.prommiseResolved("Fetched Main Listing")
            resolve(req)

        } else {
            req.listings = []
            req.message = "No More Listings Found"
            resolve(req)
        }

    })
});

// fetch a users recently viewved listings
module.exports.getRecentlyViewedListings = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("getting recently viewed listings")

    let sql = `SELECT *
        FROM listing
        RIGHT JOIN
        (SELECT *
            FROM view_log
            ORDER BY view_date DESC
            LIMIT ? OFFSET ?
            ) AS top10
        ON listing.listingID = top10.listingID
        WHERE userID = ?`

    // query the database
    req.db.query(sql, [req.listingsPerPage, req.pageOffset, req.userData.userID], (error, results) => {
        if (error) {
            reject(error)

        } if (results[0]) {

            // convert sql bool to true false
            req.listings = results.map((listing) => {
                listing.isActive = listing.isActive == "1" ? true : false
                return listing
            })

            req.message = "Recent Listings Fetched Sucessfully"

            customLog.prommiseResolved("recently viewed listings fetched")
            resolve(req)

        } else {
            req.listings = []
            req.message = "No More Listings"
            reject(req)
        }
    })
})

// get front page listings
module.exports.getFrontPageListings = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("getting front page listings")

    let sql = `SELECT *
                FROM listing
                JOIN (SELECT view_log.listingID, COUNT(view_log.viewID) AS numOfViews
                    FROM dataserver.view_log
                    WHERE isRecent = 1
                    GROUP BY view_log.listingID)
                AS topNumListings
                ON listing.listingID = topNumListings.listingID
                `


    // a list of arguments for the sql querry
    let argumentList = []

    // check if the client has given a range limit for the search
    if (req.query.locationFilterLimit != 0) {

        // append the WHERE clause to the querry and add the required input arguments
        sql += `WHERE distanceBetween(location_lat, location_lon, ?, ?) <= ? \n`

        argumentList = argumentList.concat([req.query.userLat, req.query.userLon, req.query.locationFilterLimit])
    }

    // add the orde by statement
    sql += `ORDER BY `

    // a list of parameters to order by
    orderByArray = ["numOfViews DESC"]

    // if client has specified sort type, add that sort type to the query

    if (req.query.postDateSortType != "NULL") {
        orderByArray.push(`post_date ${req.query.postDateSortType}`)
    }

    if (req.query.endDateSortType != "NULL") {
        orderByArray.push(`end_date ${req.query.endDateSortType}  \n`)
    }

    if (req.query.distanceSortType != "NULL") {
        orderByArray.push(`distanceBetween(location_lat, location_lon, ?, ?) ${req.query.distanceSortType} \n`)

        argumentList = argumentList.concat([req.query.userLat, req.query.userLon])
    }

    // place the active listings at the top
    orderByArray.push(`isActive DESC  \n`)

    // add all of the sort querries to the sql
    sql += orderByArray.join(",")

    // only select a small range of listings to reduce server load
    sql += ` LIMIT ? OFFSET ?;`
    argumentList = argumentList.concat([req.listingsPerPage, req.pageOffset])

    // query the database
    req.db.query(sql, argumentList, (error, results) => {

        if (error) {
            reject(error)

        } else if (results[0]) {
            // if at least one result is found

            // convert sql bool to true false
            req.listings = results.map((listing) => {
                listing.isActive = listing.isActive == "1" ? true : false
                return listing
            })

            req.message = "Front Page Listings Fetched"

            customLog.prommiseResolved("front page listings fetched")
            resolve(req)


        } else {
            req.listings = []
            req.message = 'No More Entries Exist'
        
            resolve(req)
        }
    })

})

// get filtered listings
module.exports.getFilteredListings = req => new Promise((resolve, reject) => {


    let sql = `
    SELECT l.* 
    FROM listing l
    JOIN 
       ( SELECT listingID
              , COUNT(*) total
           FROM listing_item_tags lt
           JOIN tags t
             ON t.tagID = lt.tagID
          WHERE t.tagName IN ?
          GROUP BY listingID) x
       ON x.listingID = l.listingID
    
            `

    // a list of arguments for the sql querry
    let argumentList = [[req.query.searchStringArray]]

    // check if the client has given a range limit for the search
    if (req.query.locationFilterLimit != 0) {

        // append the WHERE clause to the querry and add the required input arguments
        sql += `WHERE distanceBetween(location_lat, location_lon, ?, ?) <= ? \n`

        argumentList = argumentList.concat([req.query.userLat, req.query.userLon, req.query.locationFilterLimit])
    }

    // add the orde by statement
    sql += `ORDER BY `

    // a list of parameters to order by
    orderByArray = [`total DESC  \n`]

    // if client has specified sort type, add that sort type to the query

    if (req.query.postDateSortType != "NULL") {
        orderByArray.push(`post_date ${req.query.postDateSortType}`)
    }

    if (req.query.endDateSortType != "NULL") {
        orderByArray.push(`end_date ${req.query.endDateSortType}  \n`)
    }

    if (req.query.distanceSortType != "NULL") {
        orderByArray.push(`distanceBetween(location_lat, location_lon, ?, ?) ${req.query.distanceSortType} \n`)

        argumentList = argumentList.concat([req.query.userLat, req.query.userLon])
    }

    // place the active listings at the top
    orderByArray.push(`isActive DESC  \n`)

    // add all of the sort querries to the sql
    sql += orderByArray.join(",")

    // only select a small range of listings to reduce server load
    sql += ` LIMIT ? OFFSET ?;`
    argumentList = argumentList.concat([req.pageOffset, req.listingsPerPage])

    // query the database
    req.db.query(sql, argumentList,
        (error, results) => {
            if (error) {
                reject(error)

            } if (results[0]) {
                // convert sql bool to true false
                req.listings = results.map((listing) => {
                    listing.isActive = listing.isActive == "1" ? true : false
                    return listing
                })

                req.message = 'Filtered Results Fetched'

                resolve(req)

            } else {

                req.listings = []
                req.message = "No More Listings Found"
                
                resolve(req)
            }
        })

})

// get desired items
module.exports.getDesiredItems = req => new Promise((resolve, reject) => {

    let sql = `SELECT * FROM tags
        JOIN (SELECT count(userID), tagID FROM wanted_tags
        GROUP BY tagID
        ORDER BY count(userID)) AS wantedTags ON tags.tagID = wantedTags.tagID
        LIMIT ? OFFSET ?`

    // query the database
    req.db.query(sql, [req.pageOffset, req.listingsPerPage], (error, results) => {
        if (error) {
            reject(error)

        } else {
            resolve(results)
        }
    });


})

// checks if the client is the author of the listing
module.exports.checkUserIsAuthor = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("checking if user is author")

    customLog.values(req.query.listingID, "listing ID")

    let sql = `SELECT authorID FROM listing WHERE listingID = ?`

    // execute sql
    req.db.query(sql, [req.query.listingID], (error, result) => {
        if (error) {
            reject(error)

        } else if (result[0]) {
            // if listings is found

            // check if author id is the same as client id
            if (result[0].authorID == req.userData.userID) {
                customLog.prommiseResolved("User Is Author")
                resolve(req)

            } else {
                reject(new Error('You Are not the author of this listing'))

            }
        } else {
            reject(new Error('Listing Does not exist'))
        }
    })
})

// delete a listing
module.exports.deleteListing = req => new Promise((resolve, reject) => {
    customLog.prommiseStarted("deleting listing")

    // execute SQL
    req.db.query(`DELETE FROM listing WHERE listingID = ?`, [req.query.listingID], (error) => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("listing deleted")
            resolve(req)
        }
    })
})
