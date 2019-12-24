const uniqueID = require('uniqid')
const customErrors = require("../../helpers/CustomErrors")
const fs = require('fs')

var genImagePath = (image_name) => {
    return path.join(__dirname, "../../../ImageStorage/" + image_name + ".jpg")
}

module.exports.checkFileExists = req => new Promise((resolve, reject) => {
    let imagePath = genImagePath(req.query.imageID)
    fs.access(imagePath, fs.F_OK, (err) => {
        if (err) {
            if(err.message.slice(0,6) === "ENOENT"){
                console.log("imageId = ", imagePath)
                customErrors.logUserError(req.res,"image does not exist", 404)
            } else {
                customErrors.logServerError(req.res,err)
            }
        } else {
            resolve(req)
        }
    })
});

module.exports.sendImageFile = (req, res) => {
    imageID = req.query.imageID

    imagePath = genImagePath(imageID)
    res.append("message", "image fetched succesfully")
    res.append("imageID", imageID)
    res.sendFile(imagePath)
}

module.exports.fetchImageIDs = req => new Promise((resolve, reject) => {
    let sqlSelect = `SELECT imageID FROM listing_item_images WHERE
                listingItemID IN
                (SELECT listingItemID
                    FROM listing_item
                    WHERE listingID = ? )`

    req.db.query(sqlSelect, [req.query.listingID], (error, result) => {
        if (error) {
            reject(error)
        } else if (result[0]) {
            req.selectedImages = result
            resolve(req)
        } else {
            req.selectedImages = "empty"
            resolve(req)
        }
    })
})

module.exports.deleteImages = req => new Promise((resolve, reject) => {
    if (req.selectedImages == "empty") {
        console.log('no images to delete')
        resolve(req)
    }

    deleteFiles(req.selectedImages)
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