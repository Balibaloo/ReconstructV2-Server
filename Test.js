const fs = require('fs')

let imagePath = "D:\WORKUSER\Profile.V6\Documents\Computer Science\VsCode\MyWork\ImageStorage\ixws9fgk282paj6.jpg"

fs.access(imagePath, fs.F_OK, (err) => {
    if (err.message.slice(0, 6) === 'ENOENT') {
        console.log("error caught")
    }
})