const bodyParser = require('body-parser'); // parses incoming JSON data
const app = require('express')(); // initialise the application framework
const mysql = require('mysql'); // sql connection manager


const port = 1234;
const dbhost = "localhost";
const dbuser = "ServerData";
const dbpass = "SQLSECURE";
const dbName = "dataserver";

// initialise connecion to dataserver
var database = mysql.createConnection({
  host: dbhost,
  user: dbuser,
  password: dbpass,
  database: dbName,
});

// set middleware parsers for incoming JSON
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json())

// initialises all routes
require('./app/index')(app, database);

// start server
app.listen(port, () => {
  console.log('Server is live on ' + port);
  require("./app/helpers/Routines")(database) // starts my routines
});

