const bodyParser = require('body-parser');
const express = require('express');
const app = express();
var mysql = require('mysql');


const port = 1234;
const dbhost = "localhost";
const dbuser = "root";
const dbpass = "SQLSECURE";
const dbName = "PLACEHOLDERNAME";

var connection = mysql.createConnection({
  host     : dbhost,
  user     : dbuser,
  password : dbpass,
  database : dbName,
});

app.use(bodyParser.urlencoded({ extended: true }));
require('./app/routes')(app, connection);

app.listen(port, () => {
    console.log('We are live on ' + port);
});
