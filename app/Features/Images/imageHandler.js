const uniqueID = require('uniqid')
const fs = require('fs')

var genImagePath = (image_name) => {
    return path.join(__dirname, "../../../ImageStorage/" + image_name + ".jpg")
}

var sendImagedaw = (res, image_name, message = "Successfully fetched", imageID = image_name) => {
    imagePath = genImagePath(image_name)
    res.append("message", message)
    res.append("imageID", imageID)
    res.sendFile(imagePath)
}

module.exports.sendImage = (db, res, image_name) => new Promise((resolve, reject) => {
    let imagePath = genImagePath(image_name)

    fs.access(imagePath, fs.F_OK, (err) => {
        if (err) {
            if (err.message.slice(0, 6) === 'ENOENT') {
                let sql = "SELECT * FROM listing_item_images WHERE temporaryID = ?"
                db.query(sql, [image_name], (error, result) => {
                    if (error) {
                        reject(error)
                    } else if (result[0]) {
                        sendImagedaw(res, result[0].imageID, "Please use new Image ID", result[0].imageID)
                        resolve()
                    } else { reject() }
                })
            } else { reject(err) }
        } else {
            sendImagedaw(res, image_name)
            resolve()
        }
    })



}
);

module.exports.checkImageIsSaved = (db, tempImageId) => new Promise((resolve, reject) => {
    let sql = `SELECT * FROM listing_item_images 
                WHERE temporaryID = ?`
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
                resolve() // listing saved but images havent arrived yet
            }
        } else {
            reject(new Error("Image slot doesent exist")) // Image and listing dont exist
        }
    })
})

module.exports.saveImagetoDB = (req) => new Promise((resolve, reject) => {
    req.body.newID = uniqueID()

    let sql = `UPDATE listing_item_images
                SET imageID = ? , isSaved = 1
                WHERE temporaryID = ?`

    req.db.query(sql, [req.body.newID, req.body.temp_imageID], (error, result) => {
        if (error) { reject(error) }
        else { resolve(req) }
    })

})

module.exports.fetchImageIDs = (req) => new Promise((resolve, reject) => {
    let sqlSelect = `SELECT imageID WHERE
                isSaved = 1 AND
                listingItemID IN
                (SELECT listingItemID 
                    FROM listing_item 
                    WHERE listingID = ? )`

    req.db.query(sqlSelect, [req.body.listingID], (error, result) => {
        if (error) {
            reject(error)
        } else if (result) {
            req.imageIDstoDelete = result
        } else { req.imageIDstoDelete = "empty" }
    })
})

module.exports.deleteImages = req => new Promise((resolve, reject) => {
    if (req.imageIDstoDelete == "empty") { resolve() }

    deleteFiles(req.imageIDstoDelete)
})

const deleteFiles = (arr) => new Promise((resolve, reject) => {
    if (arr.length != 0) {
        fs.unlink(genImagePath(arr.shift()), (error) => {
            if (error) {
                reject(error)
            } else { deleteFiles(arr) }
        })
    } else (resolve())
})