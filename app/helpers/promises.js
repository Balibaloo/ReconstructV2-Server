var uniqueID = require('uniqid')
const Auth = require('../helpers/auther');

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

var genSQLFromNestedList = (itemList) => {
    finalString = ''
    itemList.forEach((IDTagArr, indexOne) => {
        if (indexOne !== 0) {
            finalString += ','
        }
        IDTagArr.forEach((IDTagPair, indexTwo) => {
            if (indexTwo !== 0) {
                finalString += ','
            }
            finalString += "(" + `'${IDTagPair[0]}','${IDTagPair[1]}','${IDTagPair[2]}'` + ")"
        })
    })

    return finalString
}

var genSQLFromItemList = (listingItemList, listingID) => {
    let itemListString = ''
    listingItemList.forEach((item, index) => {
        if (index !== 0) {
            itemListString += ','
        }

        itemListString += arrayToSQL([item.itemID, listingID, item.name, item.description])
    })

    return itemListString
}

module.exports.getListing = (req) => new Promise((resolve, reject) => {
    //// pulls a Listing entry from databse given listingID
    req.db.query(`SELECT *
                FROM listing
                WHERE listingID = '${req.body.listingID}'`, (error, results) => {
        results = results[0]
        if (error) {
            req.error = error
            req.error.details = 'select listing'
            reject(req)
        } else if (results) {
            req.listing = results
            resolve(req)
        } else {
            req.error = new Error('no listing found')
            req.error.details = 'no listing found'
            reject(req)
        }

    })
});

module.exports.getListingItems = (req) => new Promise((resolve, reject) => {
    //// pulls every item associated with a listingID from database

    req.db.query(`SELECT *
                FROM listing_item WHERE listingID = '${req.body.listingID}'
                `, (error, results) => {
        if (error) {
            req.error = error
            req.error.details = 'listing fetch error'
            reject(req)
        } else if (results[0]) {
            req.listing.itemList = results
            resolve(req)
        } else {
            req.error = new Error('no listing items found')
            reject(req)
        }
    })

});

module.exports.getListingItemTags = (req) => new Promise((resolve, reject) => {

    listingTagArray = req.listing.itemList.map((item) => {
        return item.listingItemID
    })

    req.db.query(`SELECT tagID,listingItemID 
        FROM listing_item_tags 
        WHERE listingItemID IN ${arrayToSQL(listingTagArray)}`,
        (error, results) => {
            if (error) {
                req.error = error
                req.error.details = 'listing Tag fetch error'
                reject(req)
            } else if (results[0]) {

                req.listing.itemList = req.listing.itemList.map((item) => {
                    item.tagList = []

                    results.filter((tagIDpair) => {
                        if (tagIDpair.listingItemID == item.listingItemID) {
                            item.tagList.push(tagIDpair.tagID)
                            return false
                        } else { return true }
                    })
                    return item
                })

                resolve(req)
            } else {
                req.error = new Error('no listing tags found')
                reject(req)
            }
        })
});

//#################################################################################
module.exports.getListingItemImages = (req) => new Promise((resolve, reject) => {
    resolve(req)
});

module.exports.saveViewRequest = (req) => new Promise((resolve, reject) => {
    //// logs a view request if the authorID does not match userID
    if (req.userData.userID != req.listing.authorID) {
        Auth.genID((newID) => {
            req.db.query(`INSERT INTO view_log
                    (viewID, userID ,listingID)
                    VALUES ('${newID}', '${req.userData.userID}', '${req.listing.listingID}')`, (error) => {
                if (error) {
                    req.error = error
                    req.error.details = 'lsiting view save error'
                    reject(req)
                } else {
                    resolve(req)
                }
            })
        })
    }
});

module.exports.saveUserPromise = (req) => new Promise((resolve, reject) => {
    req.userData = req.body

    Auth.genID((userID) => {
        req.userData.userID = userID
        db.query(`INSERT INTO user_profile
                (userID, fName, lName, email, phone)
                VALUES ('${req.userData.userID}','${firstName}','${lastName}','${email}',${phone},[])`,
            (error, result) => {
                if (error) {
                    req.error = error
                    req.error.details = 'User save'
                    reject(req)
                } else {
                    resolve(req)
                }
            })
    });
});

module.exports.decodeIncomingUP = (req) => new Promise((resolve, reject) => {
    req.userData = {}
    module.exports.authCreds = req.headers.authorization.split(' ');
    module.exports.decodedCreds = Buffer.from(authCreds[1], 'base64').toString().split(':');

    req.userData.username = decodedCreds[0]
    req.userData.password = decodedCreds[1]

    resolve(req)
})

module.exports.insertMainListing = (req) => new Promise((resolve, reject) => {
    db = req.db
    Auth.genID((idOne) => {
        var {
            title,
            body,
            end_date,
            location,
            mainPhoto
        } = req.body

        var listingID = idOne
        var authorID = req.userData.userID

        req.listingID = listingID

        db.query(`INSERT INTO listing
        (listingID, authorID, title, body, mainPhoto, end_date, location)
        VALUES ('${listingID}','${authorID}','${title}','${body}','${mainPhoto}','${end_date}','${location}')`,
            (error) => {
                if (error) {
                    req.error = error
                    req.error.details = "main Save Error"
                    reject(req)
                } else {
                    resolve(req)
                }
            }
        )
    })
})

module.exports.insertListingItems = (req) => new Promise((resolve, reject) => {
    db = req.db
    listingID = req.listingID
    itemList = req.body.itemList

    itemList.map((item) => {
        Auth.genID((newID) => {
            item.itemID = newID;
            return item
        })
    })

    req.body.itemList = itemList //// saves itemlist with item ids for other functions

    db.query(`INSERT INTO listing_item (listingItemID, listingID, name, description) VALUES ${genSQLFromItemList(itemList, listingID)}`, (error) => {
        if (error) {
            req.error = error
            req.error.details = "item Save Error"
            reject(req)
        } else {
            resolve(req)
        }
    })
})

module.exports.insertItemTags = (req) => new Promise((resolve, reject) => {
    itemList = req.body.itemList

    itemList = itemList.map((item) => {
        return item.tags.map((tag) => {
            return [tag, item.itemID, req.listingID]
        })
    })

    db.query(`INSERT INTO listing_item_tags (TagID,listingItemID,listingID) VALUES ${genSQLFromNestedList(itemList)}`, (error) => {
        if (error) {
            req.error = error
            req.error.details = "tag Save Error"
            reject(req)
        } else {
            resolve(req)
        }
    })
})

module.exports.insertImageIds = (req) => new Promise((resolve, reject) => {
    //// needs image fields to be replaced with the ids of those images
    db = req.db
    itemList = req.body.itemList

    //// sketchy, verify
    itemList = itemList.map((item) => {
        return item.images.map((image) => {
            return [image, item.itemID]
        })
    })

    db.query(`INSERT INTO listing_item_images (imageID,listingItemID) VALUES ${genSQLFromNestedList(itemList)}`, (error) => {
        if (error) {
            req.error = error
            req.error.details = "image Save Error"
            reject(req)
        } else {
            resolve(req)
        }
    })

})

module.exports.deleteListing = (req) => new Promise((resolve, reject) => {
    req.db.query(`DELETE FROM listing WHERE listingID = '${req.listingID}'`, (error) => {
        if (error) {
            req.error = error
            req.error.details = "listing delete Error"
            reject(req)
        } else {
            resolve(req)
        }
    })
})