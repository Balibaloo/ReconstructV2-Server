debug = require("../../Debug").DEBUG
masterDebug = require("../../StartServer").DEBUG

module.exports = {

    // log and send a server error
    sendServerError: (res, error, message = "Server Error") => {
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
    sendUserError: (res, message = "User Error", code = 400) => {
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
    logHeaders : {
          header: "=====",
          subHeader: "----"
    }, 
    
    // log a message wrapped in headers from the header object
    withSeparator : (header,message) => {
        if (header in this.logHeaders){
          console.log(header + ' ' + message + ' ' + header)
        } else {
          console.log("logWithSeparator Invalid Header Type")
        }
    },
    
    //log and send the json object at the same time for debug purpouses
    sendJson: (res,body) => {
        if (debug.dataOut && masterDebug) {
            console.log("JSON = "+ body)
        }
        
        // because no data can be sent after the responce is sent
        // this also logs a connection finish with the message in the json body
        this.connectionFinish(body.message)
        
        res.json(body)
    },

    // log incoming data for debug purpouses
    incomingData: (object, name = null) => {
        if (debug.incomingData && masterDebug){
            if (name){
                console.log(name + " = " + object)
            } else {
                console.log(object)
            }
        }
    },

    // log values for debug purpouses
    values: (value, name = null) => {
        if (debug.values && masterDebug){
            if (name){
                console.log(name + " = " + value)
            } else {
                console.log(value)
            }
        }
    },

    // log the start of an incoming request
    connectionStart: (message) => {
        if (debug.connectionStart && masterDebug){
            this.withSeparator(this.logHeaders.header,message)
        }
    },

    // log the end of an incoming request
    connectionFinish: (message) => {
        if (debug.connectionFinish && masterDebug){
            this.withSeparator(this.logHeaders.header,message)
        }
    },

    // log when a prommise resolves
    prommiseResolved: (message) => {
        if (debug.prommiseResolved && masterDebug){
            this.withSeparator(this.logHeaders.subHeader, message)
        }
    },

    prommiseStarted: (message) => {
        if (debug.prommiseStarted && masterDebug){
            this.withSeparator(this.logHeaders.subHeader, message)
        }
    }
}

