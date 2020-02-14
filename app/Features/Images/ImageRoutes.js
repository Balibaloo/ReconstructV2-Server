const imagePromises = require('./imagePromises')
const customErrors = require('../../helpers/CustomErrors')
const Auth = require('../Authentication/AuthenticationHelper')
path = require('path')
var multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("destinbation")
        console.log("file == ", file)
        cb(null, "ImageStorage")
    },
    filename: (req, file, cb) => {
        Auth.genID(newID => {
            req.query.newID = newID
            cb(null, req.query.newID  + path.extname(file.originalname))
        })
    }
})

const fileSaveFilter = (req, file, cb) => {
    console.log("filesavefilter")
    console.log("file = ", file)
    if (!file.originalname == ".jpg") {
        return cb(new Error('Only .jpg files are allowed!'), false);
    } else {cb(null,true)}
}


const upload = multer({ storage: storage, fileFilter: fileSaveFilter})

module.exports = (app, db) => {

    app.get("/getImage", (req, res) => {
        req.db = db
        req.myArgs = {}
        imagePromises.checkFileExists(req)
            .then((req) => imagePromises.sendImageFile(req, res))
            .catch((error,type = "server") => {
                if (type == "user") { customErrors.logUserError(res) }
                else if (type == "server") { customErrors.logServerError(res, error, error.message) }

            })
    });

    app.post("/auth/saveImage", Auth.checkToken, (req, res, next) => { req.db = db; next() }, (req, res) => {
        if (true) {console.log("==== SAVING IMAGE ====")}

        upload.single("image")(req,res, (error) => {
            if (error) {
                customErrors.logServerError(res, req.error)
            } else {
                res.json({"mesage": "image saved succesfully",
                "imageID" : req.query.newID})
            }
        })
    });

    app.delete("/auth/deleteImage", Auth.checkToken, (req,res,next) => {
        imageToDelete = req.query
        if (imageToDelete) {
            req.selectedImages = imageToDelete
            
            imagePromises.deleteImages(req)
                .then(req => {res.json({"message": "image succesfully deleted"})})
                .catch(error => customErrors.logServerError(res,error))

        } else {
            customErrors.logUserError(res,"no image id speciffied",404)
        }

    })
};
