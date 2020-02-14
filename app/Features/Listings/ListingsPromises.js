const Auth = require('../Authentication/AuthenticationHelper');

const uniqueID = require('uniqid')

module.exports.getListing = req => new Promise((resolve, reject) => {
    //// retreives a Listing entry from databse given listingID
    // needs req.query.listingID

    req.db.query(`SELECT *
                FROM listing
                WHERE listingID = ?`, [req.query.listingID], (error, results) => {
        if (error) {
            
            error.details = 'select listing'
            reject(error)
        } else if (results[0]) {
            req.listing = results[0]
            req.listing.isActive = req.listing.isActive == 1 ? true : false
            console.log("Fetched Main Listing")
            resolve(req)
        } else {
            error = new Error('no listing found')
            error.details = 'no listing found, id = ' + req.query.listingID
            reject(error)
        }

    })
});

module.exports.getUserListings = req => new Promise((resolve, reject) => {
    //// retreives a Listing entry from databse given listingID
    // needs req.query.listingID and req.userData.userID (added during Auth.checkToken)
    const sql = `SELECT *
    FROM listing
    WHERE listingID = ?
    AND authorID = ?`
    req.db.query(sql, [req.query.listingID, req.userData.userID], (error, results) => {
        if (error) {
            
            error.details = 'select listing'
            reject(error)
        } else if (results[0]) {
            req.listing = results[0]
            req.listing.isActive = req.listing.isActive == 1 ? true : false
            console.log("Fetched Main Listing")
            resolve(req)
        } else {
            error = new Error('no listing found')
            error.details = 'no listing found'
            reject(error)
        }

    })
});

module.exports.getListingItems = req => new Promise((resolve, reject) => {
    //// retreives every listing_item associated with a listingID from database
    // needs req.query.listingID
    req.db.query(`SELECT *
                FROM listing_item WHERE listingID = ?
                `, [req.query.listingID], (error, results) => {
        if (error) {
            
            error.details = 'listing fetch error'
            reject(error)
        } else if (results[0]) {
            req.listing.itemList = results
            console.log("Fetched Listing Items")
            resolve(req)
        } else {
            error = new Error('no listing items found')
            reject(error)
        }
    })

});

module.exports.getListingItemTags = req => new Promise((resolve, reject) => {
    //// retreives listin
    let sql = `SELECT * FROM tags
    JOIN (SELECT tagID,listingItemID
        FROM listing_item_tags
        WHERE listingID  = ?) AS itemFilteredTags
    ON tags.tagID = itemFilteredTags.tagID`

    req.db.query(sql, req.listing.listingID, (error, results) => {
        if (error) {
            
            error.details = 'listing Tag fetch error'
            reject(error)
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
            error = new Error('no listing tags found')
            reject(error)
        }
    })
});

module.exports.saveViewRequest = req => new Promise((resolve, reject) => {
    //// logs a view request if the authorID does not match userID
    if (req.userData.userID != req.listing.authorID) {
        Auth.genID((newID) => {
            req.db.query(`INSERT INTO view_log
                    (viewID, userID ,listingID)
                    VALUES ?`, [[[newID, req.userData.userID, req.listing.listingID]]], (error) => {
                if (error) {
                    
                    error.details = 'lsiting view save error'
                    reject(error)
                } else {
                    console.log("View Succesfully loged")
                    resolve(req)
                }
            })
        })
    } else { resolve(req) }
});

module.exports.atachImageIds = req => new Promise((resolve,reject) => {

    let sqlSelect = `SELECT imageID,listingItemID FROM listing_item_images WHERE
    listingItemID IN
    (SELECT listingItemID
        FROM listing_item
        WHERE listingID = ? )`

    req.db.query(sqlSelect, [req.listing.listingID], (error, result) => {
    if (error) {
        reject(error)
    } else if (result[0]) {
        req.listing.itemList.map(item => {
            item.imageArray = [] 
            result.forEach((idListingPair,index) => {
                if (item.listingItemID == idListingPair.listingItemID) {
                    item.imageArray.push(idListingPair.imageID)
                }
            })
        })

        resolve(req)
    }
    })


})

module.exports.saveUserPromise = req => new Promise((resolve, reject) => {
    req.userData = req.query
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

module.exports.insertMainListing = req => new Promise((resolve, reject) => {
    db = req.db
    Auth.genID((listingID) => {
        var {
            title,
            body,
            end_date,
            location_lat, 
            location_lon,
            mainImageID
        } = req.body

        var authorID = req.userData.userID
        
        req.userData.listingID = listingID
        end_date = end_date.replace("T"," ").replace("Z","")
        console.log(end_date)

        db.query(`INSERT INTO listing
        (listingID, authorID, title, body, mainImageID, location_lat, location_lon ,end_date)
        VALUES ?`, [[[listingID, authorID, title, body, mainImageID, location_lat, location_lon, end_date]]],
            (error) => {
                if (error) {
                    
                    error.details = "main Save Error"
                    reject(error)
                } else {
                    console.log("Inserted Main Listing")
                    resolve(req)
                }
            }
        )
    })
})

module.exports.insertListingItems = req => new Promise((resolve, reject) => {
    db = req.db
    listingID = req.userData.listingID
    itemList = req.body.itemList.map((item) => {
        item.itemID = uniqueID()
        return item
    })//// saves itemlist with item ids for other functions

    req.body.itemList = itemList

    itemListToInsert = itemList.map((item) => {
        return [item.itemID, listingID, item.name, item.description]
    })

    const sql = `INSERT INTO listing_item (listingItemID, listingID, name, description) VALUES ?`
    db.query(sql, [itemListToInsert], (error) => {
        if (error) {
            
            error.details = "item Save Error"
            reject(error)
        } else {
            console.log("Inserted Listing Items")
            resolve(req)
        }
    })
})

let getAllListingText = (body) => {
    finalString = ""

    finalString += body.title + " " + body.body

    body.itemList.forEach((item) => {
        finalString += item.name + " " + item.description
    }) 
    
    return finalString
}

module.exports.pruneNonTagsFrom = (tagList) => {
    const tagsToFilter = "the a an in with".split(" ")
    tagList = tagList.filter((value) => {
        if (value in tagsToFilter) {
            return false
        } else return true
    })
    return tagList
}


module.exports.insertNewTags = req => new Promise((resolve, reject) => {

    // every peice of text is used as a tag and then non keywords are filtered out of the tagList
    keywordList = getAllListingText(req.body).split(" ")
    keywordList = this.pruneNonTagsFrom(keywordList)

    // creating a set eliminates repeating tags
    let tagSet = new Set(keywordList);
    
    req.query.tagNameArray = Array.from(tagSet)
    let nestedTagArr = req.query.tagNameArray.map((item) => { return [item] })

    // if tag doesent exist, insert it
    let sql = `INSERT IGNORE INTO tags (tagName) VALUES ? `
    req.db.query(sql, [nestedTagArr], (error, result) => {
        if (error) {
            
            reject(error)
        } else {
            console.log("Inserted New Tags")
            resolve(req)
        }
    })
})

module.exports.replaceTagsWithIDs = req => new Promise((resolve, reject) => {
    let sql = `SELECT * FROM tags WHERE tagName IN (?)`

    req.db.query(sql, [req.query.tagNameArray], (error, results) => {
        if (error) {
            reject(error)
        } else {
            tagnameIdDict = tagResultListToDicionary(results)
            req.body.itemList = req.body.itemList.map((item) => {
                
                item.tagList = item.tagList.map((tagName) => {
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

module.exports.insertItemTags = req => new Promise((resolve, reject) => {
    itemList = req.body.itemList
    tagArr = req.query.tagArray

    finalTagArray = []
    itemList.forEach((item) => {
        tags = item.tagList
        tags.forEach((tagID) => { finalTagArray.push([tagID, item.itemID, req.userData.listingID]) })
    })

    let sql = `INSERT INTO listing_item_tags (TagID,listingItemID,listingID) VALUES ?`

    db.query(sql, [finalTagArray], (error) => {
        if (error) {
            
            error.details = "tag Save Error"
            reject(error)
        } else {
            console.log("Inserted Item - Tags")
            resolve(req)
        }
    })
})

module.exports.insertImageIds = req => new Promise((resolve, reject) => {
    db = req.db
    itemList = req.body.itemList

    finalImageArray = []
    itemList.forEach((item) => {
        item.images.forEach((imageID) => { finalImageArray.push([imageID, item.itemID]) })
    })

    const sql = `INSERT INTO listing_item_images (imageID, listingItemID) VALUES ?`;
    db.query(sql, [finalImageArray], (error) => {
        if (error) {
            error.details = "image Save Error"
            reject(error)
        } else {
            resolve(req)
        }
    })
});

module.exports.insertListingVisit = req => new Promise((resolve,reject) => {
    Auth.genID((viewID) => {
        let sql = "INSERT INTO view_log (viewID,userID,listingID) VALUES ?"
        req.db.query(sql,[[[viewID, req.userData.userID, req.userData.listingID]]],(error) => {
            if (error){
                error.details = "adding view to listing"
                reject(error)
            } else{
                resolve(req)
            }
        })
        
    })

    


})

module.exports.checkUserIsAuthor = req => new Promise((resolve, reject) => {
    console.log(req.query.listingID)
    let sql = `SELECT authorID FROM listing WHERE listingID = ?`

    req.db.query(sql, [req.query.listingID], (error, result) => {
        if (error) {
            reject(error)
        } else if (result[0]) {
            if (result[0].authorID == req.userData.userID) {
                console.log("User Is Author")
                resolve(req)
            } else {
                reject(new Error('You Are not the author of this listing'))
            }
        } else {
            reject(new Error('Listing Does not exist'))
        }
    })
})

module.exports.deleteListing = req => new Promise((resolve, reject) => {
    req.db.query(`DELETE FROM listing WHERE listingID = ?`, [req.query.listingID], (error) => {
        if (error) {
            reject(error)
        } else {
            resolve(req)
        }
    })
})
