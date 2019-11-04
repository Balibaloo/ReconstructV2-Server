const uniqueID = require('uniqid')
const fs = require('fs')

var genImagePath = (image_name) => {
    return path.join(__dirname, "../../../ImageStorage/" + image_name + ".jpg")
}

module.exports.checkFileExists = req => new Promise((resolve, reject) => {
    req.myArgs.usedWrongID = false

    let imagePath = genImagePath(req.query.imageID)

    fs.access(imagePath, fs.F_OK, (err) => {
        if (err) {
            if (err.message.slice(0, 6) === 'ENOENT') {
                req.myArgs.usedWrongID = true
                resolve(req)
            } else { reject(err) }
        } else {
            resolve(req)
        }
    })
});

module.exports.checkUserUsedWrongID = req => new Promise((resolve, reject) => {
    if (!req.myArgs.usedWrongID) { resolve(req) }

    let sql = `SELECT imageID, isSaved
                FROM listing_item_images WHERE temporaryID = ?
                ORDER BY isSaved DESC`

    req.db.query(sql, [req.body.imageID], (error, result) => {
        if (error) {
            reject(error)
        } else if (result[0]) {
            if (result[0].isSaved != 0) {
                req.myArgs.actualImageID = result[0].imageID
                resolve(req)
            } else { reject(new Error("Image Data Has Not Arrived Yet"), "user") }

        } else { reject(new Error("Invalid ListingID"), "user") }
    })
});

module.exports.sendImageFile = (req, res) => {
    imageID = req.myArgs.usedWrongID ? req.myArgs.actualImageID : req.body.imageID
    message = req.myArgs.usedWrongID ? "Please Use New ID" : "Successfully fetched"

    imagePath = genImagePath(imageID)
    res.append("message", message)
    res.append("imageID", imageID)
    res.sendFile(imagePath)
}

module.exports.checkImageIsSaved = req => new Promise((resolve, reject) => {
    db = req.db
    tempImageId = req.body.temp_imageID
    let sql = `SELECT * FROM listing_item_images 
                WHERE temporaryID = ? `
    db.query(sql, [tempImageId], (error, result) => {
        if (error) {
            reject(error)
        } else if (result[0]) {
            console
            if (result[0].isSaved == 1) {
                console.log("image already localy saved")
                reject(result[0].imageID)// image already localy saved
            } else {
                console.log("listing saved but images havent arrived yet")
                resolve(req) // listing saved but images havent arrived yet
            }
        } else {
            reject(new Error("Image slot doesent exist")) // Image and listing dont exist
        }
    })
})

module.exports.saveImagetoDB = req => new Promise((resolve, reject) => {
    req.body.newID = uniqueID()

    let sql = `UPDATE listing_item_images
                SET imageID = ? , isSaved = 1
                WHERE temporaryID = ?`

    req.db.query(sql, [req.body.newID, req.body.temp_imageID], (error, result) => {
        if (error) { reject(error) }
        else { resolve(req) }
    })

})

module.exports.fetchImageIDs = req => new Promise((resolve, reject) => {
    let sqlSelect = `SELECT imageID FROM listing_item_images WHERE
                isSaved = 1 AND
                listingItemID IN
                (SELECT listingItemID 
                    FROM listing_item 
                    WHERE listingID = ? )`

    req.db.query(sqlSelect, [req.body.listingID], (error, result) => {
        if (error) {
            reject(error)
        } else if (result[0]) {
            req.imageIDstoDelete = result
            resolve(req)
        } else {
            req.imageIDstoDelete = "empty"
            resolve(req)
        }
    })
})

module.exports.deleteImages = req => new Promise((resolve, reject) => {
    if (req.imageIDstoDelete == "empty") {
        console.log('no images to delete')
        resolve(req)
    }

    deleteFiles(req.imageIDstoDelete)
        .then(() => console.log('Images Deleted'))
        .then(() => resolve(req))
        .catch(error => reject(error))
})

const deleteFiles = (arr) => new Promise((resolve, reject) => {
    if (arr.length != 0) {
        fs.unlink(genImagePath(arr.shift().imageID), (error) => {
            if (error) {
                reject(error)
            } else {
                deleteFiles(arr).then(resolve)
            }
        })
    } else { resolve() }
})