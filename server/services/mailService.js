import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import { google } from 'googleapis';

/**
 * Send 6-digit OTP email using Nodemailer with Gmail SMTP
 * Transporter is created lazily inside the function so that
 * dotenv.config() has already populated process.env before use.
 * @param {string} toEmail 
 * @param {string} otp 
 */
export async function sendOtpEmail(toEmail, otp) {
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 10px; text-align: center;">
        <h2 style="color: #18181b;">OTP Verification</h2>
        <p style="color: #52525b; font-size: 15px;">Use the following 6-digit verification code to complete your login securely. This code is valid for 5 minutes.</p>
        <div style="margin: 24px 0;"><h2 style="font-size: 36px; letter-spacing: 6px; background: #f4f4f5; color: #18181b; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 0;">${otp}</h2></div>
        <p style="color: #a1a1aa; font-size: 13px;">If you did not request this code, please ignore this email.</p>
      </div>
    `;

  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_USER) {
    const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const { token } = await auth.getAccessToken();
    if (!token) throw new Error('Gmail OAuth access token was not returned');

    const rawMessage = [
      `From: ${process.env.GMAIL_USER}`,
      `To: ${toEmail}`,
      'Subject: OTP Verification',
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html
    ].join('\r\n');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(rawMessage).toString('base64url') })
    });
    if (!response.ok) throw new Error(`Gmail API error (${response.status}): ${await response.text()}`);
    return response.json();
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  let smtpAddress = smtpHost;

  try {
    [smtpAddress] = await dns.resolve4(smtpHost);
  } catch (error) {
    console.warn(`[Mail] IPv4 DNS lookup failed for ${smtpHost}: ${error.message}`);
  }

  const transporter = nodemailer.createTransport({
    host: smtpAddress,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    family: 4,
    tls: {
      servername: smtpHost
    },
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
    html
  };

  return await transporter.sendMail(mailOptions);
}
