FS = require('fs')
path = require('path')

module.exports.getImages = (ImageName) => new Promise((resolves, rejects) => {
    console.log(ImageName)
    imagePath = path.join(__dirname, "../../ImageStorage/" + ImageName + ".jpg")
    imageFile = FS.readFile(imagePath, null, (err, data) => {
        if (err) {
            console.log(err)
            rejects(err)
        } else {
            saveadta = {
                "imageName": ImageName,
                "imageFile": data
            }
            console.log(saveadta)
            resolves(saveadta)
        }

    })
})