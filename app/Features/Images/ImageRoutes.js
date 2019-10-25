const imagePromises = require('./imageHandler')
path = require('path')


module.exports = (app, db) => {
    app.get("/getImage", (req, res) => {
        imagePath = path.join(__dirname, "../../../ImageStorage/" + req.body.image_name + ".jpg")
        res.sendFile(imagePath)
    })
}