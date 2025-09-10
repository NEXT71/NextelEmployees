import nodemailer from 'nodemailer';
import config from '../config/config.js';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USERNAME,
    pass: config.EMAIL_PASSWORD
  }
});

export const sendVerificationEmail = async (email, otp) => {
  const mailOptions = {
    from: config.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Account Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="background: #f3f4f6; padding: 10px; display: inline-block; border-radius: 4px;">
          ${otp}
        </h1>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${config.CLIENT_URL}/reset-password/${token}`;
  
  const mailOptions = {
    from: config.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0;">
          Reset Password
        </a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};