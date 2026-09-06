const { sendMail } = require("../utils/mailer");
const env = require("../config/env");

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${env.publicWebUrl}/reset-password?token=${resetToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your My School Placement password",
    text: `Hi ${user.firstName},\n\nUse the link below to reset your password. This link expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>Hi ${user.firstName},</p><p>Use the link below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
}

async function sendVerificationEmail(user, verificationToken) {
  const verifyUrl = `${env.publicWebUrl}/verify-email?token=${verificationToken}`;
  await sendMail({
    to: user.email,
    subject: "Confirm your My School Placement email",
    text: `Hi ${user.firstName},\n\nWelcome to My School Placement! Please confirm your email address to finish setting up your account. This link expires in 24 hours.\n\n${verifyUrl}\n\nIf you did not create this account, you can safely ignore this email.`,
    html: `<p>Hi ${user.firstName},</p><p>Welcome to My School Placement! Please confirm your email address to finish setting up your account. This link expires in 24 hours.</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you did not create this account, you can safely ignore this email.</p>`,
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

module.exports = { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail };
