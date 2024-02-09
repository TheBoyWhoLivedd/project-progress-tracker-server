const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// * To send the email
const sendEmail = async (to, subject, html) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: to,
    subject: subject,
    html: html,
  });

  return info?.messageId;
};

module.exports={
  sendEmail,
  transporter
}