module.exports.logServerError = (res, error, message = "Server Error") => {
    if (error.error){
        error = error.error}
        
    console.log(message, error)
    try {
        res.status(500).json({
            "message": message,
            "error": error
        })
    } catch(error){ 
        console.log(error)
    }
};

module.exports.logUserError = (res, message = "User Error", code = 400) => {
    console.log(message)
    try {
        res.status(code).json({
            "message": message
        })
    } catch(error){ 
        console.log(error)
    }
}