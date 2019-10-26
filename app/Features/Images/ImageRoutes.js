const imagePromises = require('./imageHandler')
const customErrors = require('../../helpers/CustomErrors')
const Auth = require('../Authentication/AuthenticationHelper')
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
path = require('path')


module.exports = (app, db) => {

    app.get("/getImage", (req, res) => {
        imagePromises.sendImage(res, req.body.image_name)
    })

    app.post("/auth/saveImage", Auth.checkToken, (req, res, next) => { req.db = db; next() }, upload.single("image"), (req, res) => {
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
                "imageID": req.localImageID
            })
        }
    });
};