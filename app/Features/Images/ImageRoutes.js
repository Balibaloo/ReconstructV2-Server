const imagePromises = require('./imagePromises')    // import image promisses
const customLog = require('../../helpers/CustomLogs')   // import custom logger
const Auth = require('../../helpers/AuthenticationHelper')  // import authentication helper
path = require('path')  // import path system
var multer = require('multer')  // import multer

// settings object for multer
const storage = multer.diskStorage({
    
    // chose where the files are saved
    destination: (req, file, cb) => {
        // store files in a folder in the project directory called "ImageStorage"
        cb(null, "ImageStorage")
    },

    // chose the name of the file to be saved
    filename: (req, file, cb) => {

        // generate a new id for the image
        Auth.genID(newID => {

            // append image id to the request object for future reference
            req.query.newID = newID

            // the file name will be the generated id followed by the file's file type
            cb(null, req.query.newID  + path.extname(file.originalname))
        })
    }
})

// settings object for multer to filter out any unwanted files
const fileSaveFilter = (req, file, cb) => {

    // check if the file is a jpg
    if (!file.originalname == ".jpg") {

        // if the file is not a jpg, reject it
        return cb(new Error('Only .jpg files are allowed!'), false);

    } else {cb(null,true)}
}

// configure the multer instance with the setting objects defined above
const multerInstance = multer({ storage: storage, fileFilter: fileSaveFilter})

module.exports = (app, db) => {

    // fetch an image from the server
    app.get("/getImage", (req, res) => {
        customLog.connectionStart("Fetching An Image")

        if (req.query.imageID) {
            customLog.incomingData(req.query.imageID, "image ID")
            
            // append the database connection to the request object
            req.db = db

            // first check if the file exists then send it
            imagePromises.checkFileExists(req)
                .then(imagePromises.sendImageFile)
                .catch((error) => {
                    
                    // check if the error occured to the file not existing
                    if (error.message.slice(0,6) === "ENOENT"){
                        customLog.sendUserError(res,"image does not exist", 404)
                    
                    } else {
                        customLog.sendServerError(res, error, error.message) 
                    }
                })

        } else {
            customLog.sendUserError(res,"No Image Id provided", 400)
        }
        
    });

    // save an image on the server
    app.post("/auth/saveImage", Auth.checkToken, (req, res) => {
        customLog.connectionStart("Saving Image")

        // use multer to save a single image on the server
        multerInstance.single("image")(req, res, (error) => {
            if (error) {
                customLog.sendServerError(res, req.error, error.mesage)

            } else {
                customLog.sendJson(res,{"mesage": "Image Saved",
                "imageID" : req.query.newID})
            }
        })
    });

    // delete an image
    app.delete("/auth/deleteImage", Auth.checkToken, (req,res,next) => {
        customLog.connectionStart("Deleteing An Image")

        // extract image id
        imageToDelete = req.query.imageID

        // check if the client has provided an imageId to delete
        if (imageToDelete) {
            customLog.incomingData(imageToDelete, "image to delete")

            // save the imageID for the delete images function
            req.selectedImages = [imageToDelete]

            // deletes the image then sends the response to the client
            imagePromises.deleteImages(req)
                .then(req => {
                    customLog.sendJson(res,{"message": "Image Deleted"})
                    })
                .catch(error => customLog.sendServerError(res,error, error.mesage))

        } else {
            customLog.sendUserError(res,"no image id speciffied",404)
        }

    })
};
