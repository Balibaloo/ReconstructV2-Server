FS = require('fs')
path = require('path')

module.exports.getImages = (ImageNameArray) => new Promise((resolves, rejects) => {
    ImageNameArray.map((ImageName) => {
        imagePath = path.join(__dirname,"../../ImageStorage"+ImageName)
        try{
            imageFile = FS.readFile(imagePath)
        }catch{
            imageFile = "Image Not Found"
        }

        saveadta = {"imageName" :ImageName,"imageFile" : imageFile}
        console.log(saveadta)
        return saveadta
    })
    console.log(ImageNameArray)
    resolves(ImageNameArray)

})