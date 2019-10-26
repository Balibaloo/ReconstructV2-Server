const imagePromises = require('./imageHandler')
const customErrors = require('../../helpers/CustomErrors')
const Auth = require('../Authentication/AuthenticationHelper')
var multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {

    },
    filename: (req, file, cb) => {

    }
})

const fileSaveFilter = (req, file, cb) => {
    cb(null, false) // would pass no eror and reject

}
const upload = multer({ storage: storage, fileFilter: fileSaveFilter })
path = require('path')


module.exports = (app, db) => {
    app.get("/getImage", (req, res) => {
        imagePromises.sendImage(res, req.body.image_name)
    })

    app.post("/auth/saveImage", upload.single("image"), Auth.checkToken, (req, res) => {
        // use multer to save image with new id, if id doesent exist, delete image from fs
        // req.file.path = file path
        // add route to acces images from imageStore
        // get image id
        req.db = db
        console.log(req.body)
        let tempImageID = req.body.temp_imageID

        // verify that senderId matches Author id

        imagePromises.checkImageIsSaved(db, tempImageID)
            .then(imagePromises.saveImagetoDB)
            .then(imagePromises.saveImageLocaly(req))
            .then((req) => {
                res.json({
                    "message": "image succesfully saved",
                    "imageID": req.body.newID
                })
            })
            .catch((error) => {
                if (typeof error === 'string') {
                    let imageID = error
                    res.json({
                        "message": "listing already saved",
                        "imageID": imageID
                    })
                } else {
                    customErrors.logUserError(res, error.message, 404)
                }
            })




    })
}