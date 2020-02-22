

module.exports = function (app, db) {
    require('./Features/Tests/ConnectionTestRoutes')(app, db);
    /*
        Route : /
        Needs : nothing
        Sends : connection succesfull message

        Route : /auth/
        Needs : authentication token
        Sends : mesage on if authentication is succesfull
    */

    require('./Features/Accounts/AccountRoutes')(app, db);

    /*

    
    */

    require('./Features/Listings/ListingRoutes')(app, db);

    /*

    
    */

    require('./Features/Messages/MessageRoutes')(app, db);

    /*

    
    */

    require('./Features/Emails/EmailRoutes')(app, db);

    /*

    
    */

    require('./Features/Images/ImageRoutes')(app, db);

    /*

    
    */
}

