const customLog = require("../../helpers/CustomLogs")   // import custom logger
const fs = require('fs')    // import file system

// generate an image path programmaticaly
var genImagePath = (image_name) => {
    return path.join(__dirname, "../../../ImageStorage/" + image_name + ".jpg")
}

// check if a file exists
module.exports.checkFileExists = req => new Promise((resolve, reject) => {

    // get image path
    let imagePath = genImagePath(req.query.imageID)
    
    // try and read the image
    fs.access(imagePath, fs.F_OK, (error) => {
        if (error) {
            reject(error)

        } else {
            customLog.prommiseResolved("image exists")
            resolve(req)
        }
    })
});

// send an image file
module.exports.sendImageFile = (req) => {
    imageID = req.query.imageID

    // generate image path
    imagePath = genImagePath(imageID)

    // append a message to the request
    req.res.append("message", "image fetched ")

    // append the image id to the request
    req.res.append("imageID", imageID)

    // send the file
    req.res.sendFile(imagePath)

    customLog.connectionFinish("File Sent")
    
}

// fetch all image IDs of items in a listing
module.exports.fetchImageIDs = req => new Promise((resolve, reject) => {

    let sql = `SELECT imageID FROM listing_item_images WHERE
                listingItemID IN
                (SELECT listingItemID
                    FROM listing_item
                    WHERE listingID = ? )`

    // execute sql
    req.db.query(sql, req.query.listingID, (error, result) => {
        if (error) {
            reject(error)

        } else {
            req.selectedImages = result
            customLog.prommiseResolved("listing images fetched")
            resolve(req)
        }
    })
})

// delete a list of images
module.exports.deleteImages = req => new Promise((resolve, reject) => {
    customLog.incomingData(req.selectedImages, "images to delete")

    // checks if the list of images to delete is empty
    if (!req.selectedImages[0]) {
        customLog.prommiseResolved('no images to delete')
        resolve(req)
    } else {

        // delete the files in the list
        deleteFiles(req.selectedImages)
        .then(() => {
            customLog.prommiseResolved('Images Deleted')
            resolve(req)}
            )
        .catch(error => reject(error))
    }  
})


// a recursive function that deletes files
const deleteFiles = (arr) => new Promise((resolve, reject) => {

    // check if the array is not empty
    if (arr.length != 0) {

        // delete the file
        // the array is popped, then the popped value is passed to the genImagePath function 
        // which generates the image path and this is passed to the unlink function which deletes the file
        fs.unlink(genImagePath(arr.shift().imageID), (error) => {

            if (error) {
                reject(error)

            } else {
                // call itsself then once it has resolved, resolve up
                deleteFiles(arr).then(resolve)
            }
        })
    } else { 
        // if the list of files to delete is empty, resolve
        resolve() 
    }
})