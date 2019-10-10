//calls router functions
const AccountRoutes = require('./RouteCollection/AccountRoutes')
const testRoutes = require('./RouteCollection/ConnectionTestRoutes')
const ListingRoutes = require('./RouteCollection/ListingRoutes')
const MessageRoutes = require('./RouteCollection/MessageRoutes')

module.exports = function (app, db) {
    AccountRoutes.routes(app, db);
    ListingRoutes.routes(app, db);

    MessageRoutes.routes(app, db);

    testRoutes.routes(app, db);

}