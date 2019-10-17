//calls router functions
const AccountRoutes = require('./RouteCollection/AccountRoutes')
const testRoutes = require('./RouteCollection/ConnectionTestRoutes')
const ListingRoutes = require('./RouteCollection/ListingRoutes')
const MessageRoutes = require('./RouteCollection/MessageRoutes')
const EmailRoutes = require('../routes/RouteCollection/EmailRoutes')

module.exports = function (app, db) {
    AccountRoutes.routes(app, db);
    ListingRoutes.routes(app, db);
    EmailRoutes.routes(app, db);
    MessageRoutes.routes(app, db);

    testRoutes.routes(app, db);

}