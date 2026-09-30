import nodemailer from 'nodemailer';

/**
 * Send 6-digit OTP email using Nodemailer with Gmail SMTP
 * Transporter is created lazily inside the function so that
 * dotenv.config() has already populated process.env before use.
 * @param {string} toEmail 
 * @param {string} otp 
 */
export async function sendOtpEmail(toEmail, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS
    }
  });
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: toEmail,
    subject: 'OTP Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 10px; text-align: center;">
        <h2 style="color: #18181b;">OTP Verification</h2>
        <p style="color: #52525b; font-size: 15px;">Use the following 6-digit verification code to complete your login securely. This code is valid for 5 minutes.</p>
        <div style="margin: 24px 0;">
          <h2 style="font-size: 36px; letter-spacing: 6px; background: #f4f4f5; color: #18181b; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 0;">
            ${otp}
          </h2>
        </div>
        <p style="color: #a1a1aa; font-size: 13px;">If you did not request this code, please ignore this email.</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
}
