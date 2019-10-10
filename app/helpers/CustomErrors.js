

module.exports.logServerError = (res, error, message = "Server Error") => {
    console.log(message, error)
    res.status(500).json({
        "message": message,
        "error": error
    })
};

module.exports.logUserError = (res, message = "User Error", code = 400) => {
    console.log(message)
    res.status(code).json({
        "message": message
    })
}