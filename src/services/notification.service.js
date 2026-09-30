const { sendMail } = require("../utils/mailer");

async function sendOtpEmail(identifier, code, { ttlMinutes }) {
  await sendMail({
    to: identifier,
    subject: `Your My School Placement code: ${code}`,
    text: `Your one-time code is ${code}. It expires in ${ttlMinutes} minutes.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>Your one-time code is <strong>${code}</strong>. It expires in ${ttlMinutes} minutes.</p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
}

async function sendWelcomeEmail(user) {
  await sendMail({
    to: user.email,
    subject: "Welcome to My School Placement",
    text: `Hi ${user.firstName},\n\nYour My School Placement account is ready. Start an assessment to discover Nigerian universities and programmes that match your profile.\n\n"Discover more. Choose better. Plan your future."`,
    html: `<p>Hi ${user.firstName},</p><p>Your My School Placement account is ready. Start an assessment to discover Nigerian universities and programmes that match your profile.</p><p><em>"Discover more. Choose better. Plan your future."</em></p>`,
  });
}

module.exports = { sendOtpEmail, sendWelcomeEmail };
