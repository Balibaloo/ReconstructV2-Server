const imagePromises = require('./imageHandler')
const customErrors = require('../../helpers/CustomErrors')
const Auth = require('../Authentication/AuthenticationHelper')
path = require('path')
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
    checkUserIsAuthor(req)
        .then(imagePromises.checkImageIsSaved)
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
                error = errorOrImageiD
                cb(null, false)
            }
        })
}

var checkUserIsAuthor = req => new Promise((resolve, reject) => {
    getAuthorFromImageID(req)
        .then((req) => {
            if (req.userData.userID == req.listingAuthorID) {
                resolve(req)
            } else {
                customErrors.logUserError(res, "You are not the author of this listing", 403)
                reject()
            }
        }).catch((error) => { reject(error) })
});

const getAuthorFromImageID = req => new Promise((resolve, reject) => {
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

const upload = multer({ storage: storage, fileFilter: fileSaveFilter })

module.exports =(app, db) => {

    app.get("/getImage", (req, res) => {
        req.db = db
        req.myArgs = {}


        imagePromises.checkFileExists(req)
            .then(imagePromises.checkUserUsedWrongID)
            .then((req) => imagePromises.sendImageFile(req, res))
            .catch((error, type = "server") => {
                if (type == "user") { customErrors.logUserError(res) }
                else if (type == "server") { customErrors.logServerError(res, error, error.message) }

            })
    })

    app.post("/auth/saveImage", Auth.checkToken, (req, res, next) => { req.db = db; next() }, upload.single("image"), (req, res) => {
        if (error) {
            customErrors.logUserError(res, error.message, 404)
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
