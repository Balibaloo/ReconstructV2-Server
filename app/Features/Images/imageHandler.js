const fs = require('fs')
const uniqueID = require('uniqid')

var genImagePath = (image_name) => {
    return path.join(__dirname, "../../../ImageStorage/" + image_name + ".jpg")
}

module.exports.sendImage = (res, image_name) => new Promise((resolve, reject) => {
    imagePath = genImagePath(image_name)
    res.append("message", "Successfully fetched")
    res.sendFile(imagePath)
})

module.exports.checkImageIsSaved = (db, tempImageId) => new Promise((resolve, reject) => {
    console.log("tempImageId ; ", tempImageId)
    let sql = `SELECT * FROM listing_item_images 
                WHERE imageID = ?`
    db.query(sql, [tempImageId], (error, result) => {
        if (error) {
            reject(error)
        } else if (result[0]) {
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

module.exports.saveImageLocaly = (req) => new Promise((resolve, reject) => {
    //// save image on local file system
    db = req.db

    let data = req.body.image
    let path = genImagePath(req.body.newID)

    console.log("saving image to lcoal")
    fs.writeFile(path, data, (error) => {
        if (error) { reject(error) }
        else { resolve(req) }
    })

})

module.exports.saveImagetoDB = (req) => new Promise((resolve, reject) => {
    req.body.newID = uniqueID()
    db = req.db
    let sql = `UPDATE listing_item_images
                SET imageID = ? , isSaved = 1
                WHERE imageID = ?`

    console.log("saving image localy")
    db.query(sql, [req.body.newID, req.body.temp_imageID], (error, result) => {
        if (error) { reject(error) }
        else { resolve(req) }
    })

})