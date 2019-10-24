module.exports.getSQLDateTime = ([year, month, day, hour, minute = 0, second = 0]) => {
    return new Date(year, month - 1, day, hour + 1, minute, second).toISOString().replace("T", " ").split('.')[0]
}

module.exports.SQLDateTimetoArr = (dateTime) => {
    dateTime = dateTime.toISOString().split("T")
    dateTime[0] = dateTime[0].split("-")
    dateTime[1] = dateTime[1].split(".")[0].split(":")
    return [].concat(dateTime[0], dateTime[1])
}

