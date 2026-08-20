const { sendMail } = require("../utils/mailer");
const env = require("../config/env");

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${env.clientUrls[0] || "http://localhost:3000"}/reset-password?token=${resetToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your My School Placement password",
    text: `Hi ${user.firstName},\n\nUse the link below to reset your password. This link expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>Hi ${user.firstName},</p><p>Use the link below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
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

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
