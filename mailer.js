var nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const transporter = nodemailer.createTransport({
    port: 587,
    host: "mail.deepcore.dev",
    auth: {
        user: 'account@chess-js.com',
        pass: 'Y23R%M587g',
    },
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
});

function sendMail(email, metadata){
    const text = fs.readFileSync(path.join(__dirname, "./mail", metadata.txt), 'utf-8');
    const html = fs.readFileSync(path.join(__dirname, "./mail", metadata.html), 'utf-8');
    const mailData = {
        from: 'account@chess-js.com',  // sender address
        to: email,   // list of receivers
        subject: metadata.subject,
        text: text,
        html: html,
    };
    transporter.sendMail(mailData, function (err, info) {
        if (err)
            console.log(err)
    });
}

function sendSignupEmail(email){
    sendMail(email, JSON.parse(fs.readFileSync('./mail/welcome.json', 'utf-8')))
}

module.exports = {
    sendSignupEmail: sendSignupEmail
}