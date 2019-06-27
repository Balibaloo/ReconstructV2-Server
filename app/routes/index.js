//calls router functions
const noteRoutes = require('./note_routes');

module.exports = function(app, db) {
    noteRoutes.router(app, db);
}