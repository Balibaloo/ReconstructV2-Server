

module.exports = (db) => {
    checkForListingUpdates(db)
    //setTimeout(() => checkForListingUpdates(db), 1000 * 10)
}



var checkForListingUpdates = (db) => new Promise((resolve, reject) => {
    /// selects listing ids where listing end dates are close to speciffic milestones
    /// adds cases to specify what type of email to send depending on time delta


    let sql = `SELECT * 
                FROM watched_listings 
                JOIN (SELECT * FROM listing 
                    WHERE isActive = 1 ) AS listings
                ON  watched_listings.listingID = listings.listingID`

    db.query(sql, (error, result) => {
        if (error) {
            console.log(error)
        } else if (result[0]) {
            console.log(result)
        } else {
            console.log("no emails to send ")
        }

    })
})
