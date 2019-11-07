

module.exports = () => {
    tempRoutine()

}

// create custom que class to handle sending emails

var tempRoutine = (num) => {
    setInterval(() => {
        console.log("routine running")
    }, 500);
}