debug = require("../../Debug").DEBUG
masterDebug = require("../../StartServer").DEBUG

// log and send a server error
module.exports.sendServerError= (res, error, message = "Server Error") => {
    // checks if the error was passed in inside of another object
    if (error.error){
        error = error.error}
    
    // display error
    console.log(message, error)

    // send the client the error
    try {
        res.status(500).json({
            "message": message,
            "error": error
        })

        this.connectionFinish("Request Errored Out")

    } catch(error){ 
        console.log(error)
    }
},

// log and send a user error
module.exports.sendUserError = (res, message = "User Error", code = 400) => {
    // display error
    console.log(message)

    // send the client the error
    try {
        res.status(code).json({
            "message": message
        })

        this.connectionFinish("Request Errored Out")
        
    } catch(error){ 
        console.log(error)
    }
},

// object that stores all available headers
logHeaders = {
      header: "=====",
      subHeader: "----"
}, 

// log a message wrapped in headers from the header object
module.exports.withSeparator = (header,message) => {
    if (Object.values(logHeaders).includes(header)){
      console.log(header + ' ' + message + ' ' + header)
    } else {
      console.log("logWithSeparator Invalid Header Type")
    }
},

//log and send the json object at the same time for debug purpouses
module.exports.sendJson = (res,body) => {
    if (debug.dataOut && masterDebug) {
        console.log("JSON = "+ JSON.stringify(body))
    }  

    // because no data can be sent after the responce is sent
    // this also logs a connection finish with the message in the json body
    this.connectionFinish(body.message)
    
    res.json(body)
},

// log incoming data for debug purpouses
module.exports.incomingData = (object, name = null) => {
    if (debug.dataIn && masterDebug){
        if (name){
            console.log(name + " = " + object)
        } else {
            console.log(object)
        }
    }
},

// log values for debug purpouses
module.exports.values = (value, name = null) => {
    if (debug.values && masterDebug){
        if (name){
                console.log(name + " = " + value)
        } else {
            console.log(value)
        }
    }
},

// log the start of an incoming request
module.exports.connectionStart = (message) => {
    
    if (debug.connectionStart && masterDebug){
        console.log("\n \n")
        this.withSeparator(logHeaders.header,message)
    }
},

// log the end of an incoming request
module.exports.connectionFinish = (message) => {

    if (debug.connectionFinish && masterDebug){
        this.withSeparator(logHeaders.header,message)
    }
},

// log when a prommise resolves
module.exports.prommiseResolved = (message) => {
    if (debug.prommiseResolved && masterDebug){
        this.withSeparator(logHeaders.subHeader, message)
    }
},

module.exports.prommiseStarted = (message) => {
    if (debug.prommisesStarting && masterDebug){
        this.withSeparator(logHeaders.subHeader, message)
    }
}