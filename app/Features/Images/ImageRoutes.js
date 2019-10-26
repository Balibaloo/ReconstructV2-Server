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
    imagePromises.checkImageIsSaved(req.db, req)
        .then(cb(null, true))
        .catch((error) => {
            if (!typeof error === 'string') {
                cb(error, false)
            } else {
                req.localImageID = error
                cb(null, false)
            } // change this to send imageId back
        })

}
const upload = multer({ storage: storage, fileFilter: fileSaveFilter })
path = require('path')


module.exports = (app, db) => {

    app.get("/getImage", (req, res) => {
        imagePromises.sendImage(res, req.body.image_name)
    })

    app.post("/auth/saveImage", (req, res, next) => { req.db = db; next() }, upload.single("image"), Auth.checkToken, (req, res) => {
        if (req.localImageID) {
            res.json({
                "message": "listing already saved",
                "imageID": req.localImageID
            })
        }
    });
};