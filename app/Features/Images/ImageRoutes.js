const imagePromises = require('./imageHandler');
const customErrors = require('../../helpers/CustomErrors');
const Auth = require('../Authentication/AuthenticationHelper');
path = require('path');
var multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "ImageStorage")
    },
    filename: (req, file, cb) => {
        imagePromises.saveImagetoDB(req)
            .then((req) => { cb(null, req.body.newID + path.extname(file.originalname)) })
    }
})

const fileSaveFilter = (req, file, cb) => {
    imagePromises.checkImageIsSaved(req.db, req.body.temp_imageID)
        .then(() => {
            req.saveSuccessful = true
            cb(null, true)
        })
        .catch((errorOrImageiD) => {
            if (typeof errorOrImageiD === 'string') {
                req.saveSuccessful = false
                req.localImageID = errorOrImageiD
                cb(null, false)
            } else {
                console.log("received error")
                req.error = errorOrImageiD
                cb(null, false)
            }
        })
}

const upload = multer({ storage: storage, fileFilter: fileSaveFilter })

const getAuthorFromImageID = (req) => new Promise((resolve, reject) => {
    let sql = `SELECT authorID FROM listing WHERE listingID IN 
                (SELECT listingID FROM listing_item WHERE listingItemID IN
                (SELECT listingItemID FROM listing_item_images WHERE imageID = ? OR temporaryID = ?))
                `
    req.db.query(sql, [req.body.temp_imageID, req.body.temp_imageID], (error, results) => {
        if (error) {
            reject(error)
        } else if (results[0]) {
            req.listingAuthorID = results[0].authorID
            resolve(req)
        } else {
            reject(new Error("ImageId is not valid"))
        }
    })

})


const checkUserIsAuthor = (req, res, next) => {
    console.log(req)
    getAuthorFromImageID(req)
        .then((req) => {
            if (req.userData.userID == req.listingAuthorID) {
                next()
            } else {
                customErrors.logUserError(res, "You do are not the author of this listing", 403)
            }
        }).catch((error) => { })
};


module.exports = (app, db) => {

    app.get("/getImage", (req, res) => {
        imagePromises.sendImage(db, res, req.query.imageID)
            .then((val) => { console.log("Image Sent Succefully") })
            .catch((error) => {
                if (!error) {
                    customErrors.logUserError(res, "Image Doesent Exist", 404)
                } else customErrors.logServerError(res, error)
            })
    })

    app.post("/auth/saveImage", (req, res, next) => { req.db = db; next() }, Auth.checkToken, checkUserIsAuthor, upload.single("image"), (req, res) => {
        if (req.error) {
            customErrors.logUserError(res, req.error.message, 404)
        } else if (!req.saveSuccessful) {
            res.json({
                "message": "image already saved",
                "imageID": req.localImageID
            })
        } else if (req.saveSuccessful) {
            res.json({
                "message": "image saved successfuly",
                "imageID": req.body.newID
            })
        }
    });
};