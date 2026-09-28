import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { sendOtpEmail } from '../services/mailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MS = 30 * 1000; // 30 seconds

// In-Memory OTP Store: Map<email, { otp, expiresAt, lastSentAt }>
const otpStore = new Map();

// Temporary store for verified-but-not-yet-passworded signups (15 min expiry)
// Map<email, { name, department, stream, availability, role, verifiedAt }>
const verifiedSignupStore = new Map();
const VERIFIED_EXPIRY_MS = 15 * 60 * 1000;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const extractRoleFromEmail = (email) => {
  if (!email || typeof email !== 'string') return 'student';
  const trimmed = email.trim().toLowerCase();
  if (trimmed.endsWith('@admin.org')) return 'admin';
  if (trimmed.endsWith('@heritageit.edu.in')) return 'teacher';
  return 'student';
};

// 1. Detect Domain
router.post('/detect-domain', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required' });
  const role = extractRoleFromEmail(email);
  res.json({ role, valid: true, message: `Identified role: ${role.toUpperCase()}` });
});

// 2. Send OTP
// forLogin=true: check user exists first; forLogin=false (signup): just send
router.post('/send-otp', async (req, res) => {
  try {
    const { email, forLogin } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const normalizedEmail = email.trim().toLowerCase();

    if (forLogin) {
      const existingUser = await db.users.findByEmail(normalizedEmail);
      if (!existingUser) {
        return res.status(404).json({ error: 'No account found with this email address. Please register first.' });
      }
    }

    const existing = otpStore.get(normalizedEmail);
    if (existing && Date.now() - existing.lastSentAt < RATE_LIMIT_MS) {
      const remainingSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${remainingSec} seconds before requesting a new OTP.` });
    }

    const otp = generateOtp();
    otpStore.set(normalizedEmail, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS, lastSentAt: Date.now() });
    await sendOtpEmail(normalizedEmail, otp);
    console.log(`OTP for ${normalizedEmail}: ${otp}`);
    return res.json({ message: 'OTP sent successfully', email: normalizedEmail });
  } catch (error) {
    console.error('[Auth] send-otp error:', error);
    return res.status(500).json({ error: 'Failed to send OTP email: ' + (error.message || 'Unknown error') });
  }
});

// 3. Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = otpStore.get(normalizedEmail);
    if (existing && Date.now() - existing.lastSentAt < RATE_LIMIT_MS) {
      const remainingSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${remainingSec} seconds before requesting a new OTP.` });
    }

    const otp = generateOtp();
    otpStore.set(normalizedEmail, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS, lastSentAt: Date.now() });
    await sendOtpEmail(normalizedEmail, otp);
    console.log(`OTP for ${normalizedEmail}: ${otp}`);
    return res.json({ message: 'OTP resent successfully', email: normalizedEmail });
  } catch (error) {
    console.error('[Auth] resend-otp error:', error);
    return res.status(500).json({ error: 'Failed to resend OTP email: ' + (error.message || 'Unknown error') });
  }
});

// 4. Verify OTP
// LOGIN (forLogin=true): verify OTP -> issue JWT immediately
// SIGNUP (forLogin=false): verify OTP -> store profile -> return { otpVerified: true }
//   Client must call /set-password next to create the account.
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, department, stream, availability, forLogin } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) return res.status(400).json({ error: 'OTP not found. Please click "Send OTP" first.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP has expired. Please request a new verification code.' });
    }
    if (record.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check your inbox and try again.' });
    }

    otpStore.delete(normalizedEmail);
    const role = extractRoleFromEmail(normalizedEmail);

    if (forLogin) {
      // LOGIN via OTP — issue JWT
      const user = await db.users.findByEmail(normalizedEmail);
      if (!user) return res.status(404).json({ error: 'No account found with this email address. Please register first.' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password_hash: _, ...safeUser } = user;
      return res.json({ message: 'OTP verified — login successful', token, user: safeUser });

    } else {
      // SIGNUP — store profile; client must call /set-password next
      verifiedSignupStore.set(normalizedEmail, {
        name: name || normalizedEmail.split('@')[0],
        department: department || '',
        stream: stream || '',
        availability: availability || [],
        role,
        verifiedAt: Date.now()
      });
      return res.json({
        message: 'Email verified. Please set your password to complete registration.',
        otpVerified: true,
        email: normalizedEmail
      });
    }
  } catch (error) {
    console.error('[Auth] verify-otp error:', error);
    return res.status(500).json({ error: 'Verification failed: ' + (error.message || 'Unknown error') });
  }
});

// 5. Set Password (POST /set-password)
// Called after OTP verified in signup. Creates account + issues JWT.
router.post('/set-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });

    const normalizedEmail = email.trim().toLowerCase();
    const signupData = verifiedSignupStore.get(normalizedEmail);

    if (!signupData) {
      return res.status(400).json({ error: 'Email verification not found or expired. Please restart the signup process.' });
    }
    if (Date.now() - signupData.verifiedAt > VERIFIED_EXPIRY_MS) {
      verifiedSignupStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'Verification session expired. Please restart the signup process.' });
    }

    const existing = await db.users.findByEmail(normalizedEmail);
    if (existing) {
      verifiedSignupStore.delete(normalizedEmail);
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await db.users.create({
      name: signupData.name,
      email: normalizedEmail,
      role: signupData.role,
      department: signupData.department || signupData.stream || 'General',
      stream: signupData.stream || '',
      availability: signupData.availability || [],
      password_hash
    });

    verifiedSignupStore.delete(normalizedEmail);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash: _, ...safeUser } = user;
    return res.json({ message: 'Account created successfully', token, user: safeUser });
  } catch (error) {
    console.error('[Auth] set-password error:', error);
    return res.status(500).json({ error: 'Account creation failed: ' + (error.message || 'Unknown error') });
  }
});

// 6. Password Login (POST /login) — works for ALL roles
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.users.findByEmail(normalizedEmail);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.password_hash || user.password_hash === 'OTP_VERIFIED') {
      return res.status(401).json({ error: 'This account has no password. Please log in using OTP verification.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash: _, ...safeUser } = user;
    return res.json({ message: 'Logged in successfully', token, user: safeUser });
  } catch (error) {
    console.error('[Auth] login error:', error);
    return res.status(500).json({ error: 'Login failed: ' + (error.message || 'Unknown error') });
  }
});

// 7. Admin Signup (POST /admin-signup) — no OTP, just domain + password
router.post('/admin-signup', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'Email, name, and password are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const role = extractRoleFromEmail(normalizedEmail);
    if (role !== 'admin') return res.status(403).json({ error: 'Admin accounts must use the @admin.org email domain' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });

    const existing = await db.users.findByEmail(normalizedEmail);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await db.users.create({
      name: name.trim(),
      email: normalizedEmail,
      role: 'admin',
      department: 'Campus Administration',
      stream: '',
      availability: [],
      password_hash
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash: _, ...safeUser } = user;
    return res.json({ message: 'Admin account created successfully', token, user: safeUser });
  } catch (error) {
    console.error('[Auth] admin-signup error:', error);
    return res.status(500).json({ error: 'Admin signup failed: ' + (error.message || 'Unknown error') });
  }
});

// 8. Current User Profile (GET /me)
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
