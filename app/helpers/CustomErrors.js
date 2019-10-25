module.exports.logServerError = (res, error, message = "Server Error") => {
    console.log(message, error)
    try {
        res.status(500).json({
            "message": message,
            "error": error
        })
    } finally { }
};

module.exports.logUserError = (res, message = "User Error", code = 400) => {
    console.log(message)
    try {
        res.status(code).json({
            "message": message
        })
    } finally { }
}