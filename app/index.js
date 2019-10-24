//calls router functions
const AccountRoutes = require('./Features/Accounts/AccountRoutes')
const testRoutes = require('./Features/Tests/ConnectionTestRoutes')
const ListingRoutes = require('./Features/Listings/ListingRoutes')
const MessageRoutes = require('./Features/Messages/MessageRoutes')
const EmailRoutes = require('./Features/Emails/EmailRoutes')

module.exports = function (app, db) {
    AccountRoutes.routes(app, db);
    ListingRoutes.routes(app, db);
    EmailRoutes.routes(app, db);
    MessageRoutes.routes(app, db);
    testRoutes.routes(app, db);

}