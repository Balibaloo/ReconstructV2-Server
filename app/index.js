

module.exports = function (app, db) {
    require('./Features/Accounts/AccountRoutes')(app, db);
    require('./Features/Tests/ConnectionTestRoutes')(app, db);
    require('./Features/Listings/ListingRoutes')(app, db);
    require('./Features/Messages/MessageRoutes')(app, db);
    require('./Features/Emails/EmailRoutes')(app, db);
    require('./Features/Images/ImageRoutes')(app, db);

}