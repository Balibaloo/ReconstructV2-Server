const nodemailer = require('nodemailer');
const Auth = require('../helpers/AuthenticationHelper')
const promises = require('../helpers/promises')
const crypto = require('crypto');

/// to send veriffication email, send email to email provided in the user email with random code generated

var buildUrl = (systemIPandPort, verifficationId, username) => {
    return 'https://' + systemIPandPort + '/verifyEmail?verification=' + verifficationId.toString() + "&username=" + username
}

var getEmail = (db, userId) => new Promise((resolve, reject) => {
    db.query(`SELECT email FROM user_profile WHERE userID = '${userId}'`, (error, results) => {
        if (error) {
        } if (results[0]) {
            resolve(results[0].email)
        }
        else { console.log('elseessse') }
    })
})

module.exports.sendAccountVerification = async (req) => {
    userEmail = await getEmail(req.db, req.userData.userID)
    username = await Auth.getUsername(req.userData.userID)

    var verifID = crypto.randomBytes(20).toString('hex');
    var verifficationLink = buildUrl("82.3.163.116:1234", verifID, username)

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'reconstructnoreply@gmail.com',
            pass: 'raketa15'
        }
    });

    let emailDetails = {
        from: '"reConstruct Team" <reconstructnoreply@gmail.com>', // sender address
        to: userEmail, // list of receivers
        subject: 'Please verrify your email', // Subject line
        text: 'Hi,\n please click on the link bellow to verify your email \n\n' + verifficationLink, // plain text body
        html: '<b>Hi,<br> please click on the link bellow to verify your email <br><br>' + verifficationLink + '</b>' // html body
    }

    Auth.saveEmailVerificationCode(verifID)
        .then(transporter.sendMail(emailDetails))
        .then((req) => {
            console.log('verrification code send succesfully')
            return req
        })
        .catch(console.log)

};

module.exports.verifyEmail = (req) => new Promise((resolve, reject) => {
    promises.setEmailVerified(req)
    //https://MYURL/verifyEmail?
    //verification=CONFIRMATIONCODE
    //&username=USERNAME
});