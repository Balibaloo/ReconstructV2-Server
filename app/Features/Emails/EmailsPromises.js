const nodemailer = require('nodemailer'); // import nodemailer (used to send emails)
const Auth = require('../../helpers/AuthenticationHelper') // import athentication helper
const crypto = require('crypto') // import crypto to generate 
const customLog = require('../../helpers/CustomLogs') // custom logger

// generate a url that a user can click to verrify their email
var buildVerifficationUrl = (systemIPandPort, verifficationId, username) => {
    return 'http://' + systemIPandPort + '/verifyEmail?verification=' + verifficationId.toString() + "&username=" + username
}

// fetch a users email adress
var getUserEmail = (db, userId) => new Promise((resolve, reject) => {

    let sql = `SELECT email FROM user_profile WHERE userID = ?`

    // execute sql
    db.query(sql, userId, (error, results) => {
        if (error) {
            reject(error)

        } else if (results[0]) {
            // if at least one user has been found
            resolve(results[0].email)

        } else {
            reject(new Error("No User Found"))
        }
    })
})

// email the verrification url to the user
module.exports.sendAccountVerification = async req => {
    
    // asynchronously get the users email
    userEmail = await getUserEmail(req.db, req.userData.userID)

    // asynchronously get the users username
    username = await Auth.getUsername(req.userData.userID)

    // generate a random secure 20 character code to act as a verrification code
    var verrificationCode = crypto.randomBytes(20).toString('hex');

    // generate a clickable url to send to the user
    var verifficationLink = buildVerifficationUrl("82.3.163.116:1234", verrificationCode, username)

    // create a nodemailer instance
    let transporter = nodemailer.createTransport({
        service: 'gmail',

        auth: {
            user: 'reconstructnoreply@gmail.com',
            pass: 'raketa15'
        }
    });

    // email data that is sent to the user
    let emailDetails = {
        from: '"ReConstruct Team" <reconstructnoreply@gmail.com>', // sender address
        to: userEmail, // users email
        subject: 'Please verrify your email',
        text: 'Hi,\n please click on the link bellow to verify your email \n\n' + verifficationLink, // plain text body
        html: '<b>Hi,<br> please click on the link bellow to verify your email <br><br>' + verifficationLink + '</b>' // html body
    }
    // asynchronously save the verrification code into the database
    // then send the email to the user
    await Auth.saveEmailVerificationCode(verrificationCode, req.userData.userID)
        .then(transporter.sendMail(emailDetails))
        .catch((error) => {
            throw error
        })
    
    customLog.prommiseResolved("Verrification Email Sent")

    // resolve
    return req

};


