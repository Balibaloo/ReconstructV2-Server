const mysql = require('mysql'); // sql connection manager
const customLog = require("./CustomLogs") // custom logger

//#region dataserver_structure
let dataserver_structure = `
--
 -- Create database
 --

CREATE DATABASE IF NOT EXISTS dataserver DEFAULT CHARACTER
SET utf8mb4 COLLATE utf8mb4_bin;

--
 -- Drop the function if it exists then add it to the server
 -- This is the easiest way to add a funciton to a server if you dont already know if the function exists


DROP FUNCTION IF EXISTS dataserver.keyDoesentExists;
CREATE FUNCTION dataserver.keyDoesentExists(keyName VARCHAR(30), tableName VARCHAR(30))
 RETURNS boolean 
 BEGIN RETURN NOT EXISTS
  (SELECT *
   FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = 'dataserver'
     AND CONSTRAINT_NAME = keyName
     AND TABLE_NAME = tableName ); 
     END;


     --
     -- function to calculate distance between to coordinates on a sphere using the Haversine formula 
     --
     
DROP FUNCTION IF EXISTS dataserver.distanceBetween;
  CREATE FUNCTION dataserver.distanceBetween(latOne double, lonOne double, latTwo double, lonTwo double)
   RETURNS double 
   BEGIN	


      RETURN  3960 * acos( cos( radians( latOne ) ) *
      cos( radians( latTwo ) ) * cos( radians(  lonTwo  ) - radians( lonOne ) ) +
      sin( radians( latOne ) ) * sin( radians(  latTwo  ) ));

    END;

CREATE EVENT
IF NOT EXISTS dataserver.updateInactiveListings 
ON SCHEDULE EVERY 15 MINUTE 
ON COMPLETION 
NOT PRESERVE ENABLE 
DO UPDATE dataserver.listing SET isActive = 0 WHERE end_date < NOW();

-- --------------------------------------------------------
 --
 -- Table structure for table listing
 --

CREATE TABLE IF NOT EXISTS dataserver.listing(
  listingID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  authorID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  title varchar(50) COLLATE utf8mb4_bin NOT NULL,
  body varchar(500) COLLATE utf8mb4_bin NOT NULL,
  mainImageID text COLLATE utf8mb4_bin NOT NULL,
  location_lat DOUBLE NOT NULL,
  location_lon DOUBLE NOT NULL,
  post_date TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  end_date TIMESTAMP NOT NULL DEFAULT '0000-00-00 00:00:00',
  isActive tinyint(1) NOT NULL DEFAULT 1) 
  ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table listing_item
 --

CREATE TABLE IF NOT EXISTS dataserver.listing_item (
  listingItemID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  listingID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  name varchar(50) COLLATE utf8mb4_bin NOT NULL,
  description varchar(200) COLLATE utf8mb4_bin NOT NULL,
  isAvailable tinyint(1) NOT NULL DEFAULT 1,
  takenByUserID varchar(40) COLLATE utf8mb4_bin DEFAULT NULL)
   ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table listing_item_images
 --

CREATE TABLE IF NOT EXISTS dataserver.listing_item_images (
  imageID varchar(40) COLLATE utf8mb4_bin DEFAULT NULL,
  listingItemID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  imageIndex int(11) NOT NULL) 
  ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table listing_item_tags
 --

CREATE TABLE IF NOT EXISTS dataserver.listing_item_tags (
  tagID int(40) NOT NULL,
  listingItemID varchar(40) COLLATE utf8mb4_bin DEFAULT NULL,
  listingID varchar(40) COLLATE utf8mb4_bin NOT NULL)
   ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table message_history
 --

CREATE TABLE IF NOT EXISTS dataserver.message_history (
  messageID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  senderID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  targetID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  title text COLLATE utf8mb4_bin NOT NULL,
  body text COLLATE utf8mb4_bin NOT NULL,
  time_sent TIMESTAMP NOT NULL DEFAULT current_timestamp())
   ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table tags
 --

CREATE TABLE IF NOT EXISTS dataserver.tags (
  tagName varchar(40) COLLATE utf8mb4_bin NOT NULL,
  tagID int(40) NOT NULL) ENGINE=InnoDB DEFAULT
CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table user_profile
 --

CREATE TABLE IF NOT EXISTS dataserver.user_profile (
  userID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  fName varchar(20) COLLATE utf8mb4_bin NOT NULL,
  lName varchar(20) COLLATE utf8mb4_bin NOT NULL,
  email varchar(50) COLLATE utf8mb4_bin NOT NULL,
  emailValid tinyint(1) NOT NULL DEFAULT 0,
  phone bigint(20) DEFAULT NULL,
  forward_mesages tinyint(1) NOT NULL DEFAULT 0) 
  ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table view_log
 --

CREATE TABLE IF NOT EXISTS dataserver.view_log (
  viewID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  userID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  listingID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  view_date TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  isRecent tinyint(1) NOT NULL DEFAULT 1)
  ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table wanted_tags
 --

CREATE TABLE IF NOT EXISTS dataserver.wanted_tags (
  tagID int(40) NOT NULL,
  userID varchar(40) COLLATE utf8mb4_bin NOT NULL) 
  ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
 --
 -- Table structure for table watched_listings
 --

CREATE TABLE IF NOT EXISTS dataserver.watched_listings (
  userID varchar(40) COLLATE utf8mb4_bin NOT NULL,
  listingID varchar(40) COLLATE utf8mb4_bin NOT NULL)
  ENGINE=InnoDB DEFAULT
  CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


COMMIT;
    `
//#endregion dataserver_structure

//#region data_server_indexes

let data_server_indexes = `

DROP FUNCTION IF EXISTS dataserver.indexDoesentExists;
CREATE FUNCTION dataserver.indexDoesentExists(keyName VARCHAR(40)) RETURNS boolean BEGIN RETURN NOT EXISTS
  (SELECT *
   FROM information_schema.INNODB_SYS_INDEXES
   WHERE NAME = keyName ); END;

--
-- Indexes for table listing
--
 IF dataserver.keyDoesentExists('PRIMARY', 'listing') THEN
ALTER TABLE dataserver.listing ADD PRIMARY KEY (listingID);

END IF;

IF dataserver.indexDoesentExists('listingListingID') THEN
ALTER TABLE dataserver.listing ADD UNIQUE KEY listingListingID (listingID);

END IF;

IF dataserver.indexDoesentExists('listingAuthorID') THEN
ALTER TABLE dataserver.listing ADD KEY listingAuthorID (authorID);

END IF;

--
-- Indexes for table listing_item
--
 IF dataserver.keyDoesentExists('PRIMARY', 'listing_item') THEN
ALTER TABLE dataserver.listing_item ADD PRIMARY KEY (listingItemID);

END IF;

IF dataserver.indexDoesentExists('listing_itemItemID') THEN
ALTER TABLE dataserver.listing_item ADD UNIQUE KEY listing_itemItemID (listingItemID);

END IF;

IF dataserver.indexDoesentExists('listing_itemListingID') THEN
ALTER TABLE dataserver.listing_item ADD KEY listing_itemListingID (listingID);

END IF;

--
-- Indexes for table listing_item_images
--
 IF dataserver.keyDoesentExists('PRIMARY', 'listing_item_images') THEN
ALTER TABLE dataserver.listing_item_images ADD PRIMARY KEY (imageIndex);

END IF;

IF dataserver.indexDoesentExists('listing_item_imagesListingIDUnique') THEN
ALTER TABLE dataserver.listing_item_images ADD KEY listing_item_imagesListingIDUnique (listingItemID);

END IF;

--
-- Indexes for table listing_item_tags
--
 IF dataserver.indexDoesentExists('listing_item_tagsListingItemID') THEN
ALTER TABLE dataserver.listing_item_tags ADD KEY listing_item_tagsListingItemID (listingItemID);

END IF;

IF dataserver.indexDoesentExists('listing_item_tagsTagID') THEN
ALTER TABLE dataserver.listing_item_tags ADD KEY listing_item_tagsTagID (tagID);

END IF;

IF dataserver.indexDoesentExists('listing_item_tagsListingID') THEN
ALTER TABLE dataserver.listing_item_tags ADD KEY listing_item_tagsListingID (listingID);

END IF;

--
-- Indexes for table message_history
--
 IF dataserver.keyDoesentExists('PRIMARY', 'message_history') THEN
ALTER TABLE dataserver.message_history ADD PRIMARY KEY (messageID);

END IF;

IF dataserver.indexDoesentExists('message_historyMessageID') THEN
ALTER TABLE dataserver.message_history ADD UNIQUE KEY message_historyMessageID (messageID);

END IF;

IF dataserver.indexDoesentExists('message_historySenderID') THEN
ALTER TABLE dataserver.message_history ADD KEY message_historySenderID (senderID);

END IF;

IF dataserver.indexDoesentExists('message_historyTargetID') THEN
ALTER TABLE dataserver.message_history ADD KEY message_historyTargetID (targetID);

END IF;

--
-- Indexes for table tags
--
 IF dataserver.keyDoesentExists('PRIMARY', 'tags') THEN
ALTER TABLE dataserver.tags ADD PRIMARY KEY (tagID);

END IF;

IF dataserver.indexDoesentExists('tagsTagName') THEN
ALTER TABLE dataserver.tags ADD UNIQUE KEY tagsTagName (tagName);

END IF;

IF dataserver.indexDoesentExists('tagsTagID') THEN
ALTER TABLE dataserver.tags ADD KEY tagsTagID (tagID);

END IF;

--
-- Indexes for table user_profile
--
 IF dataserver.keyDoesentExists('PRIMARY', 'user_profile') THEN
ALTER TABLE dataserver.user_profile ADD PRIMARY KEY (userID);

END IF;

IF dataserver.indexDoesentExists('user_profileUserID') THEN
ALTER TABLE dataserver.user_profile ADD UNIQUE KEY user_profileUserID (userID);

END IF;

IF dataserver.indexDoesentExists('user_profileEmail') THEN
ALTER TABLE dataserver.user_profile ADD UNIQUE KEY user_profileEmail (email);

END IF;

--
-- Indexes for table view_log
--
 IF dataserver.keyDoesentExists('PRIMARY', 'view_log') THEN
ALTER TABLE dataserver.view_log ADD PRIMARY KEY (viewID);

END IF;

IF dataserver.indexDoesentExists('view_logViewIDUnique') THEN
ALTER TABLE dataserver.view_log ADD UNIQUE KEY view_logViewIDUnique (viewID);

END IF;

IF dataserver.indexDoesentExists('view_logUserID') THEN
ALTER TABLE dataserver.view_log ADD KEY view_logUserID (userID);

END IF;

IF dataserver.indexDoesentExists('view_logListingID') THEN
ALTER TABLE dataserver.view_log ADD KEY view_logListingID (listingID);

END IF;

IF dataserver.indexDoesentExists('view_logView_date') THEN
ALTER TABLE dataserver.view_log ADD KEY view_logView_date (view_date);

END IF;

--
-- Indexes for table wanted_tags
--
 IF dataserver.indexDoesentExists('wanted_tagsTagID') THEN
ALTER TABLE dataserver.wanted_tags ADD KEY wanted_tagsTagID (tagID);

END IF;

IF dataserver.indexDoesentExists('view_logUserID') THEN
ALTER TABLE dataserver.view_log ADD KEY view_logUserID (userID);

END IF;

--
-- Indexes for table watched_listings
--
 IF dataserver.indexDoesentExists('watched_listingsUserID') THEN
ALTER TABLE dataserver.watched_listings ADD KEY watched_listingsUserID (userID);

END IF;

IF dataserver.indexDoesentExists('watched_listingsListingID') THEN
ALTER TABLE dataserver.watched_listings ADD KEY watched_listingsListingID (listingID);

END IF;

--
-- AUTO_INCREMENT for table listing_item_images
--

ALTER TABLE dataserver.listing_item_images MODIFY imageIndex int(11) NOT NULL AUTO_INCREMENT,
                                                                              AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table tags
--

ALTER TABLE dataserver.tags MODIFY tagID int(40) NOT NULL AUTO_INCREMENT,
                                                          AUTO_INCREMENT=342;


COMMIT;
`

//#endregion 

//#region data_server_constraints 
let data_server_constraints = `

DROP FUNCTION IF EXISTS dataserver.constraintDoesentExists;
CREATE FUNCTION dataserver.constraintDoesentExists (constraintName VARCHAR(30)) RETURNS boolean BEGIN RETURN NOT EXISTS
  (SELECT *
   FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = 'dataserver'
     AND CONSTRAINT_NAME = constraintName
     AND CONSTRAINT_TYPE = 'FOREIGN KEY' ); END;

--
 -- Constraints for table listing
 --
 IF dataserver.constraintDoesentExists('listing_ibfk_1') THEN
ALTER TABLE dataserver.listing ADD CONSTRAINT listing_ibfk_1
FOREIGN KEY (authorID) REFERENCES user_profile (userID);

END IF;

--
 -- Constraints for table listing_item
 --
 IF dataserver.constraintDoesentExists('listing_item_ibfk_1') THEN
ALTER TABLE dataserver.listing_item ADD CONSTRAINT listing_item_ibfk_1
FOREIGN KEY (listingID) REFERENCES listing (listingID) ON
DELETE CASCADE;

END IF;

--
 -- Constraints for table listing_item_images
 --
 IF dataserver.constraintDoesentExists('listing_item_images_ibfk_1') THEN
ALTER TABLE dataserver.listing_item_images ADD CONSTRAINT listing_item_images_ibfk_1
FOREIGN KEY (listingItemID) REFERENCES listing_item (listingItemID) ON
DELETE CASCADE;

END IF;

--
 -- Constraints for table listing_item_tags
 --
 IF dataserver.constraintDoesentExists('listing_item_images_ibfk_1') THEN
ALTER TABLE dataserver.listing_item_images ADD CONSTRAINT listing_item_images_ibfk_1
FOREIGN KEY (listingItemID) REFERENCES listing_item (listingItemID) ON
DELETE CASCADE;

END IF;

IF dataserver.constraintDoesentExists('listing_item_tags_ibfk_1') THEN
ALTER TABLE dataserver.listing_item_tags ADD CONSTRAINT listing_item_tags_ibfk_1
FOREIGN KEY (listingItemID) REFERENCES listing_item (listingItemID) ON
DELETE CASCADE;

END IF;

IF dataserver.constraintDoesentExists('listing_item_tags_ibfk_3') THEN
ALTER TABLE dataserver.listing_item_tags ADD CONSTRAINT listing_item_tags_ibfk_3
FOREIGN KEY (listingID) REFERENCES listing (listingID) ON
DELETE CASCADE;

END IF;

IF dataserver.constraintDoesentExists('listing_item_tags_ibfk_4') THEN
ALTER TABLE dataserver.listing_item_tags ADD CONSTRAINT listing_item_tags_ibfk_4
FOREIGN KEY (tagID) REFERENCES tags (tagID) ON
DELETE CASCADE;

END IF;

--
 -- Constraints for table message_history
 --
 IF dataserver.constraintDoesentExists('message_history_ibfk_1') THEN
ALTER TABLE dataserver.message_history ADD CONSTRAINT message_history_ibfk_1
FOREIGN KEY (senderID) REFERENCES user_profile (userID);

END IF;

IF dataserver.constraintDoesentExists('message_history_ibfk_2') THEN
ALTER TABLE dataserver.message_history ADD CONSTRAINT message_history_ibfk_2
FOREIGN KEY (targetID) REFERENCES user_profile (userID);

END IF;

--
 -- Constraints for table view_log
 --
 IF dataserver.constraintDoesentExists('view_log_ibfk_1') THEN
ALTER TABLE dataserver.view_log ADD CONSTRAINT view_log_ibfk_1
FOREIGN KEY (userID) REFERENCES user_profile (userID) ON
DELETE CASCADE;

END IF;

IF dataserver.constraintDoesentExists('view_log_ibfk_2') THEN
ALTER TABLE dataserver.view_log ADD CONSTRAINT view_log_ibfk_2
FOREIGN KEY (listingID) REFERENCES listing (listingID) ON
DELETE CASCADE;

END IF;

--
 -- Constraints for table wanted_tags
 --
 IF dataserver.constraintDoesentExists('wanted_tags_ibfk_1') THEN
ALTER TABLE dataserver.wanted_tags ADD CONSTRAINT wanted_tags_ibfk_1
FOREIGN KEY (userID) REFERENCES user_profile (userID) ON
DELETE CASCADE;

END IF;

IF dataserver.constraintDoesentExists('wanted_tags_ibfk_2') THEN
ALTER TABLE dataserver.wanted_tags ADD CONSTRAINT wanted_tags_ibfk_2
FOREIGN KEY (tagID) REFERENCES tags (tagID) ON
DELETE CASCADE;

END IF;

--
 -- Constraints for table watched_listings
 --
 IF dataserver.constraintDoesentExists('watched_listings_ibfk_1') THEN
ALTER TABLE dataserver.watched_listings ADD CONSTRAINT watched_listings_ibfk_1
FOREIGN KEY (userID) REFERENCES user_profile (userID) ON
DELETE CASCADE;

END IF;

IF dataserver.constraintDoesentExists('watched_listings_ibfk_2') THEN
ALTER TABLE dataserver.watched_listings ADD CONSTRAINT watched_listings_ibfk_2
FOREIGN KEY (listingID) REFERENCES listing (listingID) ON
DELETE CASCADE;

END IF;


COMMIT;
    `
//#endregion data_server_constraints 



//#region authenticatication_server_structure
let authenticatication_server_structure =
  `
        --
        -- Database: authenticationserver
        --
        
        CREATE DATABASE IF NOT EXISTS authenticationserver DEFAULT CHARACTER
        SET utf8mb4 COLLATE utf8mb4_bin;
        
        
        DROP FUNCTION IF EXISTS authenticationserver.keyDoesentExists;
        CREATE FUNCTION authenticationserver.keyDoesentExists(keyName VARCHAR(30), tableName VARCHAR(30)) RETURNS boolean BEGIN RETURN NOT EXISTS
          (SELECT *
           FROM information_schema.TABLE_CONSTRAINTS
           WHERE CONSTRAINT_SCHEMA = 'authenticationserver'
             AND CONSTRAINT_NAME = keyName
             AND TABLE_NAME = tableName ); END;
        
        --
        -- Table structure for table alltokens
        --
        
        CREATE TABLE IF NOT EXISTS authenticationserver.alltokens (Token varchar(40) COLLATE utf8mb4_bin NOT NULL,
        isValid bit(1) NOT NULL DEFAULT b'1',
        userID varchar(40) COLLATE utf8mb4_bin NOT NULL,
        DateCreated TIMESTAMP NOT NULL DEFAULT current_timestamp()) ENGINE=InnoDB DEFAULT
        CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
        
        -- --------------------------------------------------------
         --
        -- Table structure for table emailverification
        --
        
        CREATE TABLE IF NOT EXISTS authenticationserver.emailverification (userID varchar(40) COLLATE utf8mb4_bin NOT NULL,
        verificationID varchar(40) COLLATE utf8mb4_bin NOT NULL) ENGINE=InnoDB DEFAULT
        CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
        
        -- --------------------------------------------------------
         --
        -- Table structure for table login_credentials
        --
        
        CREATE TABLE IF NOT EXISTS authenticationserver.login_credentials (userID varchar(40) COLLATE utf8mb4_bin NOT NULL,
        password varchar(70) COLLATE utf8mb4_bin NOT NULL,
        username varchar(40) COLLATE utf8mb4_bin NOT NULL,
        salt varchar(40) COLLATE utf8mb4_bin NOT NULL)
        ENGINE=InnoDB DEFAULT
        CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
        
        
        COMMIT;
    `
//#endregion authenticatication_server_structure

//#region authenticatication_server_indexes

let authenticatication_server_indexes = `

DROP FUNCTION IF EXISTS authenticationserver.indexdoesentexists;
CREATE FUNCTION authenticationserver.indexdoesentexists(keyname VARCHAR(40)) RETURNS BOOLEAN BEGIN RETURN NOT EXISTS
  (SELECT *
   FROM information_schema.innodb_sys_indexes
   WHERE name = keyname ); END;

  --
  -- Indexes for table alltokens
  --
 
  IF authenticationserver.keydoesentexists('PRIMARY', 'alltokens')
  THEN
  ALTER TABLE authenticationserver.alltokens ADD PRIMARY KEY (token);
  END IF;

  IF authenticationserver.indexdoesentexists('alltokensTokenUnique') THEN
  ALTER TABLE authenticationserver.alltokens ADD UNIQUE KEY alltokensTokenUnique (token);
  END IF;

  IF authenticationserver.indexdoesentexists('alltokensUserIDKey') THEN
  ALTER TABLE authenticationserver.alltokens ADD KEY alltokensUserIDKey (userid);
  END IF;

  --
  -- Indexes for table emailverification
  --
 
  IF authenticationserver.indexdoesentexists('emailverificationVerificationID')
  THEN
  ALTER TABLE authenticationserver.emailverification ADD UNIQUE KEY emailverificationVerificationID (verificationid);
  END IF;

  IF authenticationserver.indexdoesentexists('emailverificationUserIDKey') THEN
  ALTER TABLE authenticationserver.emailverification ADD KEY emailverificationUserIDKey (userid);
  END IF;

  --
  -- Indexes for table login_credentials
  --


  IF authenticationserver.keydoesentexists('PRIMARY', 'login_credentials') THEN
  ALTER TABLE authenticationserver.login_credentials ADD PRIMARY KEY (userid);
  END IF;

  IF authenticationserver.indexdoesentexists('login_credentialsUserID')
  THEN
  ALTER TABLE authenticationserver.login_credentials ADD KEY login_credentialsUserID (userid);
  END IF;

  IF authenticationserver.indexdoesentexists('login_credentialsUserIDUnique') THEN
  ALTER TABLE authenticationserver.login_credentials ADD UNIQUE KEY login_credentialsUserIDUnique (userid);
  END IF;

  COMMIT;
`


//#endregion authenticatication_server_indexes

//#region authenticatication_server_constraints
let authenticatication_server_constraints = `
  
DROP FUNCTION IF EXISTS dataserver.constraintdoesentexists;
CREATE FUNCTION dataserver.constraintdoesentexists (constraintname VARCHAR(30)) RETURNS BOOLEAN BEGIN RETURN NOT EXISTS
  (SELECT *
 FROM information_schema.table_constraints
 WHERE CONSTRAINT_SCHEMA = 'authenticationserver'
   AND CONSTRAINT_NAME = constraintname
   AND constraint_type = 'FOREIGN KEY' );
   
   END;
  
  
  --
  -- Constraints for table emailverification
  --
IF dataserver.constraintdoesentexists('emailverificationUserId') THEN
ALTER TABLE authenticationserver.emailverification ADD CONSTRAINT emailverificationUserId
FOREIGN KEY (userid) REFERENCES login_credentials (userid) ON
DELETE CASCADE;
END IF;

--
-- Constraints for table login_credentials
--
IF dataserver.constraintdoesentexists('userIdcontstraint') THEN
ALTER TABLE authenticationserver.login_credentials ADD CONSTRAINT userIdcontstraint
FOREIGN KEY (userid) REFERENCES dataserver.user_profile (userid) ON
DELETE CASCADE;

END IF;


COMMIT;

    `
//#endregion authenticatication_server_constraints


module.exports = (sqlparams) => new Promise((resolve, reject) => {

  // delete the database name parameter in case the database doesent exist
  delete sqlparams.database

  // enables multiple statements per query
  sqlparams.multipleStatements = true

  // connect to database server
  authDatabase = mysql.createConnection(sqlparams)

  let promises = [
    runSql(authDatabase, dataserver_structure, "data structure"),
    runSql(authDatabase, authenticatication_server_structure, "auth structure"),

    runSql(authDatabase, data_server_indexes, "data indexes"),
    runSql(authDatabase, authenticatication_server_indexes, "auth indexes"),

    runSql(authDatabase, data_server_constraints, "data constraints"),
    runSql(authDatabase, authenticatication_server_constraints, "auth constranints")
  ]

  // run all promises
  Promise.all(promises)
    .then(() => {
      customLog.prommiseResolved("successfully set up database")
      resolve()

    }).catch((error) => {
      reject(error)
    })
})


// run sql and display a message when completed
let runSql = (db, sql, name) => new Promise((resolve, reject) => {
  db.query(sql, (error) => {
    if (error) {
      reject(error)

    } else {
      customLog.prommiseResolved(name + " set up")
      resolve()
    }
  })
})