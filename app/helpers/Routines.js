const imagePromises = require("../Features/Images/imagePromises")
const fs = require("fs")


// start the routines
module.exports = (db) => {

    // repeat every hour
    setTimeout(() => deleteUnUsedImages(db),1000 * 60 * 60)
    
    
    //setTimeout(checkForListingUpdates(db), 1000 * 10)
}

// delete any images not linked to a listing
var deleteUnUsedImages = (db) => {

    // select all images linked to a listing
    let sql = `
    SELECT imageID FROM listing_item_images
    UNION
    SELECT mainImageID FROM listing
    `

    db.query(sql, (error, imageIds) => {

        if (error) {
            console.log(error)

        } else {

            // extract imageID from packet
            imageIds = imageIds.map((packet) => {
                return packet.imageID
            })

            // get all filenames saved on the local system
            fs.readdir(path.join(__dirname, "../../ImageStorage"), (error, fileNames) => {
                if (error) {
                    console.log(error)

                } else {
                    req = {}

                    req.selectedImages = fileNames
                        .map((value) => {
                            return value.split(".")[0] // return everything before .
                        })
                        .filter((value) => {
                            return imageIds.indexOf(value) === -1 // filter out items which are linked to a listing
                        }).map((id) => {
                            return { "imageID": id } // wrap imageID in an object for the deleteImages
                        })

                    imagePromises.deleteImages(req)
                }
            })
        }

    })
}

var checkForListingUpdates = (db) => new Promise((resolve, reject) => {
    /// selects listing ids where listing end dates are close to speciffic milestones
    /// adds cases to specify what type of email to send depending on time delta


    let sql = `SELECT * 
                FROM watched_listings 
                JOIN (SELECT * FROM listing 
                    WHERE isActive = 1 ) AS listings
                ON  watched_listings.listingID = listings.listingID`

    db.query(sql, (error, result) => {
        if (error) {
            console.log(error)
        } else if (result[0]) {
            console.log(result)
        } else {
            console.log("no emails to send ")
        }

    })
})
