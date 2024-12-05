const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.swartstudio.co.za',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmailNotification = (email,  title, message) => {
  let subject = title;
  const templatePath = path.join(__dirname,'../' ,'templates', 'Notification.html');
  fs.readFile(templatePath, 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading email template:', err);
      return;
    }

    const emailHtml = html.replace(/{{title}}/g, title).replace('{{message}}', message);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: emailHtml,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  });
};

module.exports = { sendEmailNotification };
