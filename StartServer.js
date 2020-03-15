// debug toggle
// for further options look in Debug.js
module.exports.DEBUG = true;

// sql connection parammeters

const sqlParams = {
  host: "localhost",
  user: "ServerData",
  password: "SQLSECURE",
  database: "dataserver",
  multipleStatements: false,
}
const port = 8080;

module.exports.masterUrl = "82.3.163.116:" + port


const bodyParser = require('body-parser'); // parses incoming JSON data
const app = require('express')(); // initialise the application framework
const mysql = require('mysql'); // sql connection manager
const routines = require("./app/helpers/Routines") // custom routines
const Auth = require("./app/helpers/AuthenticationHelper") // authentication helper
const databaseSetup = require("./app/helpers/databaseSetup") // sql commands to set up server
const readline = require('readline') // user input for terminal
var exec = require('child_process').exec, child;


// initialise a readline interface
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let database = null

let startAPI = () => {

  // initialise connecion to dataserver
  database = mysql.createConnection(sqlParams);

  // set middleware parsers for incoming JSON
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.use(bodyParser.json())

  // initialises all routes
  require('./app/index')(app, database);

  app.listen(port, (error) => {
    console.log('Server is live on ' + port);
    
    routines(database) // starts my routines
    
  });

  startUserInput()
}

let startUserInput = () => {

  // wait for user input 
  console.log("q - shut the server down \n r - stop rest api")
  let waitForInput = () => {
    rl.question("", function (answer) {
      if (answer == "q") {
        stopServer();

      } else if (answer == "r") {
        stopAPI();

      } else {
        waitForInput()
      }
    });
  }

  waitForInput()

}

// stop the whole server
let stopServer = () => {

  console.log("Server Shutting Down")

  // close database connection
  database.end();

  // stop xampp server
  exec("pkexec /opt/lampp/lampp stop",
    function (error, stdout, stderr) {

      // kill this process
      process.kill(0)
    });
}

// used to just stop the api so that code changes can be applied without restarting xampp
let stopAPI = () => {
  // close database connection
  database.end();

  // kill this process
  process.kill(0)
}


// START THE SERVER
exec("pkexec /opt/lampp/lampp start",
      function (error, stdout, stderr) {

        console.log('stdout: ' + stdout)
        console.log('stderr: ' + stderr)

        if (error !== null) {
          console.log('xampp error: ' + error);
        }

        // check if the xampp is started
        if ((["ok", "already running"].includes(stdout.split(".")[12]))) {
          console.log("xampp Started")
          
          databaseSetup(Auth.authDbParams)
            .then(() => startAPI())
            .catch(error => console.log(error))
          
        }
      });