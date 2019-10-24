const bodyParser = require('body-parser');
const express = require('express');
const app = express();
var mysql = require('mysql');



const port = 1234;
const dbhost = "localhost";
const dbuser = "ServerData";
const dbpass = "SQLSECURE";
const dbName = "dataserver";

var connection = mysql.createConnection({
  host: dbhost,
  user: dbuser,
  password: dbpass,
  database: dbName,
});

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json())


require('./app/index')(app, connection);

app.listen(port, () => {
  console.log('Ya Boi is live on ' + port);
});