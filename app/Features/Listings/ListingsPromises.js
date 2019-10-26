const Auth = require('../Authentication/AuthenticationHelper');

const uniqueID = require('uniqid')

module.exports.getListing = (req) => new Promise((resolve, reject) => {
    //// retreives a Listing entry from databse given listingID
    // needs req.body.listingID

    req.db.query(`SELECT *
                FROM listing
                WHERE listingID = ?`, [req.body.listingID], (error, results) => {
        if (error) {
            req.error = error
            req.error.details = 'select listing'
            reject(req)
        } else if (results[0]) {
            req.listing = results[0]
            req.listing.isActive = req.listing.isActive == 1 ? true : false
            console.log("Fetched Main Listing")
            resolve(req)
        } else {
            req.error = new Error('no listing found')
            req.error.details = 'no listing found'
            reject(req)
        }

    })
});

module.exports.getUserListings = (req) => new Promise((resolve, reject) => {
    //// retreives a Listing entry from databse given listingID
    // needs req.body.listingID and req.userData.userID (added during Auth.checkToken)
    const sql = `SELECT *
    FROM listing
    WHERE listingID = ?
    AND authorID = ?`
    req.db.query(sql, [req.body.listingID, req.userData.userID], (error, results) => {
        if (error) {
            req.error = error
            req.error.details = 'select listing'
            reject(req)
        } else if (results[0]) {
            req.listing = results[0]
            req.listing.isActive = req.listing.isActive == 1 ? true : false
            console.log("Fetched Main Listing")
            resolve(req)
        } else {
            req.error = new Error('no listing found')
            req.error.details = 'no listing found'
            reject(req)
        }

    })
});

module.exports.getListingItems = (req) => new Promise((resolve, reject) => {
    //// retreives every listing_item associated with a listingID from database
    // needs req.body.listingID
    req.db.query(`SELECT *
                FROM listing_item WHERE listingID = ?
                `, [req.body.listingID], (error, results) => {
        if (error) {
            req.error = error
            req.error.details = 'listing fetch error'
            reject(req)
        } else if (results[0]) {
            req.listing.itemList = results
            console.log("Fetched Listing Items")
            resolve(req)
        } else {
            req.error = new Error('no listing items found')
            reject(req)
        }
    })

});

module.exports.getListingItemTags = (req) => new Promise((resolve, reject) => {
    //// retreives listin
    let sql = `SELECT * FROM tags
    JOIN (SELECT tagID,listingItemID
        FROM listing_item_tags
        WHERE listingID  = ?) AS itemFilteredTags
    ON tags.tagID = itemFilteredTags.tagID`

    req.db.query(sql, req.listing.listingID, (error, results) => {
        if (error) {
            req.error = error
            req.error.details = 'listing Tag fetch error'
            reject(req)
        } else if (results[0]) {
            //matches tagIds to listings using listing item id

            req.listing.itemList = req.listing.itemList.map((item) => {
                item.tagList = []
                results.filter((tagIDpair) => {
                    if (tagIDpair.listingItemID == item.listingItemID) {
                        item.tagList.push(tagIDpair.tagName)
                        return false
                    } else { return true }
                })
                return item
            })
            console.log("Fetched Listing Item Tags")
            resolve(req)
        } else {
            req.error = new Error('no listing tags found')
            reject(req)
        }
    })
});

//#################################################################################
module.exports.getListingItemImages = (req) => new Promise((resolve, reject) => {
    //// just need to load image ID strings into item
    console.log("Fetched Listing Item Images")
    resolve(req)
});

module.exports.saveViewRequest = (req) => new Promise((resolve, reject) => {
    //// logs a view request if the authorID does not match userID
    if (req.userData.userID != req.listing.authorID) {
        Auth.genID((newID) => {
            req.db.query(`INSERT INTO view_log
                    (viewID, userID ,listingID)
                    VALUES ?`, [[[newID, req.userData.userID, req.listing.listingID]]], (error) => {
                if (error) {
                    req.error = error
                    req.error.details = 'lsiting view save error'
                    reject(req)
                } else {
                    console.log("View Succesfully loged")
                    resolve(req)
                }
            })
        })
    } else { resolve(req) }
});

module.exports.saveUserPromise = (req) => new Promise((resolve, reject) => {
    req.userData = req.body
    Auth.genID((userID) => {
        req.userData.userID = userID
        req.db.query(`INSERT INTO user_profile (userID, fName, lName, email, phone)
                    VALUES ?`,
            [[req.userData.userID, req.userData.first_name, req.userData.last_name, req.userData.email, req.userData.phone]],
            (error, result) => {
                if (error) {
                    req.error = error
                    req.error.details = 'User save'
                    reject(req)
                } else {
                    console.log('main User Saved')
                    resolve(req)
                }
            })
    });
});

module.exports.insertMainListing = (req) => new Promise((resolve, reject) => {
    db = req.db
    Auth.genID((idOne) => {
        var {
            title,
            body,
            end_date,
            location,
            main_photo
        } = req.body

        var listingID = idOne
        var authorID = req.userData.userID

        req.listingID = listingID

        db.query(`INSERT INTO listing
        (listingID, authorID, title, body, main_photo, end_date, location)
        VALUES ?`, [[[listingID, authorID, title, body, main_photo, end_date, location]]],
            (error) => {
                if (error) {
                    req.error = error
                    req.error.details = "main Save Error"
                    reject(req)
                } else {
                    console.log("Inserted Main Listing")
                    resolve(req)
                }
            }
        )
    })
})

module.exports.insertListingItems = (req) => new Promise((resolve, reject) => {
    db = req.db
    listingID = req.listingID
    itemList = req.body.item_list.map((item) => {
        item.itemID = uniqueID()
        return item
    })//// saves itemlist with item ids for other functions

    req.body.item_list = itemList

    itemListToInsert = itemList.map((item) => {
        return [item.itemID, listingID, item.name, item.description]
    })

    const sql = `INSERT INTO listing_item (listingItemID, listingID, name, description) VALUES ?`
    db.query(sql, [itemListToInsert], (error) => {
        if (error) {
            req.error = error
            req.error.details = "item Save Error"
            reject(req)
        } else {
            console.log("Inserted Listing Items")
            resolve(req)
        }
    })
})

module.exports.insertNewTags = (req) => new Promise((resolve, reject) => {
    itemList = req.body.item_list

    let tagSet = new Set();
    itemList.forEach((item) => {
        item.tags.forEach((tag) => {
            tagSet.add(tag)
        })
    })

    req.body.tagNameArray = Array.from(tagSet)
    let nestedTagArr = req.body.tagNameArray.map((item) => { return [item] })

    // if tag doesent exist, insert it
    let sql = `INSERT IGNORE INTO tags (tagName) VALUES ? `
    req.db.query(sql, [nestedTagArr], (error, result) => {
        if (error) {
            req.error = error
            reject(req)
        } else {
            console.log("Inserted New Tags")
            resolve(req)
        }
    })
})

module.exports.replaceTagsWithIDs = (req) => new Promise((resolve, reject) => {
    let sql = `SELECT * FROM tags WHERE tagName IN (?)`

    req.db.query(sql, [req.body.tagNameArray], (error, results) => {
        if (error) {
            reject(error)
        } else {
            tagnameIdDict = tagResultListToDicionary(results)
            req.body.item_list = req.body.item_list.map((item) => {
                item.tags = item.tags.map((tagName) => {
                    return tagnameIdDict[tagName]
                })
                return item
            })
            console.log("Replaced Tag names with tagIDs")
            resolve(req)
        }
    })

});

var tagResultListToDicionary = (tagDataList) => {
    returnDictionary = {}
    tagDataList.forEach((item) => {
        returnDictionary[item.tagName] = item.tagID
    })
    return returnDictionary

};

module.exports.insertItemTags = (req) => new Promise((resolve, reject) => {
    itemList = req.body.item_list
    tagArr = req.body.tagArray

    finalTagArray = []
    itemList.forEach((item) => {
        tags = item.tags
        tags.forEach((tagID) => { finalTagArray.push([tagID, item.itemID, req.listingID]) })
    })

    let sql = `INSERT INTO listing_item_tags (TagID,listingItemID,listingID) VALUES ?`

    db.query(sql, [finalTagArray], (error) => {
        if (error) {
            req.error = error
            req.error.details = "tag Save Error"
            reject(req)
        } else {
            console.log("Inserted Item - Tags")
            resolve(req)
        }
    })
})

///////////////////////////////////////////////////////
module.exports.insertImageIds = (req) => new Promise((resolve, reject) => {
    db = req.db
    itemList = req.body.item_list

    itemList = itemList.map((item) => {
        return [item.images, item.itemID]
    })

    const sql = `INSERT INTO listing_item_images (imageID,listingItemID) VALUES ?`;
    db.query(sql, [itemList], (error) => {
        if (error) {
            req.error = error
            req.error.details = "image Save Error"
            reject(req)
        } else {
            resolve(req)
        }
    })
});///////////////////////////////////////////////////////


module.exports.deleteListing = (req) => new Promise((resolve, reject) => {
    req.db.query(`DELETE FROM listing WHERE listingID = ?`, [req.listingID], (error) => {
        if (error) {
            req.error = error
            req.error.details = "listing delete Error"
            reject(req)
        } else {
            resolve(req)
        }
    })
})