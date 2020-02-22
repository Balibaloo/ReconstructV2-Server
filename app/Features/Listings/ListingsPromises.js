const Auth = require('../Authentication/AuthenticationHelper') // import authentication helper
const customLog = require('../../helpers/CustomLogs')   // import custom logger
const tagPruner = require('../../helpers/tagPruner')    // import tag pruner
const uniqueID = require('uniqid') // import id generator

//// Create A Listing
// insert a listing entry into the listing table
module.exports.insertMainListing = req => new Promise((resolve, reject) => {



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
        req.userData.listingID = listingID

        // convert ISO standard date to SQL date
        end_date = end_date.replace("T"," ").replace("Z","")

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
    
    // saves itemlist with new item ids for other functions
    req.body.itemList = req.body.itemList.map((item) => {
        // generate a new id for an item
        item.itemID = uniqueID()

        return item
    })

    // extracts data from the list of items to be inserted via SQL
    itemListToInsert = req.body.itemList.map((item) => {
        return [item.itemID, req.userData.listingID, item.name, item.description]
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

    // every peice of text is used as a tag and then non keywords are filtered out of the tagList
    keywordList = getAllListingWords(req.body)
    keywordList = tagPruner.pruneNonTagsFrom(keywordList)

    // creating a set eliminates repeating tags    
    req.query.tagNameArray = Array.from(new Set(keywordList))

    // wraps every tag in an array so that the tag list is not treated as one entry in the database 
    let nestedTagArr = req.query.tagNameArray.map((item) => { return [item] })


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

// retreve all the text from a listing
let getAllListingWords = (body) => {
    allText = ""

    // adds listing title and body into the allWords string
    allText += body.title + " " + body.body

    // adds every item name and description to the allWords String
    body.itemList.forEach((item) => {
        allText += item.name + " " + item.description
    }) 
    
    // splits the allText string into a list of all the words in a listing
    return allText.split(" ")
}

// 
module.exports.replaceTagsWithIDs = req => new Promise((resolve, reject) => {

    let sql = `SELECT * FROM tags WHERE tagName IN ?`

    // fetch tags and tag ids from the databse
    req.db.query(sql, [req.query.tagNameArray], (error, results) => {
        if (error) {
            reject(error)

        } else {
            // parses the results into a dictionary 
            tagNameIdDictionary = tagResultListToDicionary(results)
            

            // replaces the tags in each item with the ids of the tags
            req.body.itemList = req.body.itemList.map((item) => {
                
                item.tagList = item.tagList.map((tagName) => {
                    return tagNameIdDictionary[tagName]
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

    finalDataArray = []
    
    // adds tagID,itemID and listingID to an array to be inserted into the database
    req.body.itemList.forEach((item) => {
        item.tagList.forEach((tagID) => { finalDataArray.push([tagID, item.itemID, req.userData.listingID]) })
    })

    let sql = `INSERT INTO listing_item_tags (TagID,listingItemID,listingID) VALUES ?`

    // insert data into the listing_item_tags table
    db.query(sql, [finalTagArray], (error) => {
        if (error) {
            error.details = "tag Save Error"
            reject(error)

        } else {
            customLog.prommiseResolved("Inserted Item <-> Tags")
            resolve(req)
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
module.exports.logListingView = req => new Promise((resolve,reject) => {

    // check that the client is not the author of the listing
    if (req.userData.userID != req.listing.authorID) {
        
        // generate an id for the visit
        Auth.genID((viewID) => {

        let sql = "INSERT INTO view_log (viewID,userID,listingID) VALUES ?"

        // insert the view
        req.db.query(sql,[[[viewID, req.userData.userID, req.userData.listingID]]], (error) => {
            if (error){
                error.details = "logging view to listing"
                reject(error)

            } else{
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
    // requires query.listingID

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
                } catch(error) {
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

// module.exports.getListingItemTags = req => new Promise((resolve, reject) => {

//     let sql = `SELECT * FROM tags
//     JOIN (SELECT tagID,listingItemID
//         FROM listing_item_tags
//         WHERE listingID  = ?) AS itemFilteredTags
//     ON tags.tagID = itemFilteredTags.tagID`

//     req.db.query(sql, req.listing.listingID, (error, results) => {
//         if (error) {
            
//             error.details = 'listing Tag fetch error'
//             reject(error)
//         } else if (results[0]) {
//             //matches tagIds to listings using listing item id

//             req.listing.itemList = req.listing.itemList.map((item) => {
//                 item.tagList = []
//                 results.filter((tagIDpair) => {
//                     if (tagIDpair.listingItemID == item.listingItemID) {
//                         item.tagList.push(tagIDpair.tagName)
//                         return false
//                     } else { return true }
//                 })
//                 return item
//             })
//             console.log("Fetched Listing Item Tags")
//             resolve(req)
//         } else {
//             error = new Error('no listing tags found')
//             reject(error)
//         }
//     })
// });

// atatches image ids to items
module.exports.atachImageIds = req => new Promise((resolve,reject) => {

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

    const sql = `SELECT *
    FROM listing
    WHERE listingID = ?
    AND authorID = ?`

    // execute SQL
    req.db.query(sql, [req.query.listingID, req.userData.userID], (error, results) => {
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

            customLog.prommiseResolved("Fetched Main Listing")
            resolve(req)

        } else {
            error = new Error('no listing found')
            error.details = 'fetching user listings'
            reject(error)
        }

    })
});

// checks if the client is the author of the listing
module.exports.checkUserIsAuthor = req => new Promise((resolve, reject) => {

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
