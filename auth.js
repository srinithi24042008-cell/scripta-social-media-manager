const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const BrandProfile = require('../models/BrandProfile');
const { requireAuth } = require('../middleware/auth');
const PlatformConfig = require('../models/PlatformConfig');
const { forgotPasswordLimiter } = require('../middleware/rateLimiter');
const { fetchWithTimeout } = require('../utils/retry');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    _id: id,
    email,
    password_hash: passwordHash,
    name: name || '',
  });

  await BrandProfile.create({ user_id: id });

  const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email, name: name || '', default_platforms: [] } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name, default_platforms: user.default_platforms || [] },
  });
});

router.post('/google', async (req, res) => {
  const { access_token, id_token, credential } = req.body;
  const token = access_token || id_token || credential;
  if (!token) return res.status(400).json({ error: 'Google token is required' });

  try {
    let profile = null;
    let tokenInfo = {};

    if (access_token) {
      const tokenInfoRes = await fetchWithTimeout(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(access_token)}`
      );
      if (tokenInfoRes.ok) {
        tokenInfo = await tokenInfoRes.json().catch(() => ({}));
      }

      const userinfoRes = await fetchWithTimeout('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!userinfoRes.ok) {
        throw new Error('Failed to fetch Google profile with access token');
      }
      profile = await userinfoRes.json();
    } else {
      const tokenInfoRes = await fetchWithTimeout(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
      );
      if (!tokenInfoRes.ok) throw new Error('Invalid or expired Google ID token');
      tokenInfo = await tokenInfoRes.json();
      profile = {
        email: tokenInfo.email,
        name: tokenInfo.name || tokenInfo.given_name || '',
      };
    }

    // 2. Audience & Client ID validation
    const dbConfigGoogle = await PlatformConfig.findOne({ platform: 'google' }).lean().catch(() => null);
    const dbConfigYoutube = await PlatformConfig.findOne({ platform: 'youtube' }).lean().catch(() => null);

    const rawAllowed = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.VITE_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_ID,
      dbConfigGoogle?.client_id,
      dbConfigYoutube?.client_id,
    ];

    const allowedClientIds = rawAllowed
      .filter(Boolean)
      .map(id => String(id).trim().replace(/^["']|["']$/g, ''));

    const tokenParties = [
      tokenInfo.aud,
      tokenInfo.azp,
      tokenInfo.issued_to,
      tokenInfo.client_id,
      tokenInfo.app_id,
    ].filter(Boolean).map(id => String(id).trim());

    if (allowedClientIds.length > 0 && tokenParties.length > 0) {
      const isMatch = allowedClientIds.some(allowedId =>
        tokenParties.some(partyId => partyId === allowedId)
      );

      if (!isMatch) {
        console.warn('[Google Auth Warning] Mismatch between token parties:', tokenParties, 'and allowed IDs:', allowedClientIds);
        return res.status(401).json({ error: 'Google token was not issued for this application.' });
      }
    }

    if (!profile || !profile.email) {
      return res.status(400).json({ error: 'Google profile does not contain an email address.' });
    }

    let user = await User.findOne({ email: profile.email });
    if (!user) {
      const id = uuidv4();
      const randomPassword = await bcrypt.hash(uuidv4(), 10);
      user = await User.create({
        _id: id,
        email: profile.email,
        password_hash: randomPassword,
        name: profile.name || '',
      });
      await BrandProfile.create({ user_id: id });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, default_platforms: user.default_platforms || [] },
    });
  } catch (err) {
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

router.post('/google-credentials', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Google email and password are required.' });
  }

  const nodemailer = require('nodemailer');
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: email,
        pass: password,
      },
    });

    // Verify SMTP connection to prove credentials are correct
    await transporter.verify();
  } catch (smtpErr) {
    return res.status(401).json({
      error: `Invalid Google credentials: ${smtpErr.message}. Ensure you are using a valid Google App Password.`
    });
  }

  try {
    let user = await User.findOne({ email });
    const bcryptLib = require('bcryptjs');
    if (!user) {
      const id = uuidv4();
      const randomPassword = await bcryptLib.hash(uuidv4(), 10);
      user = await User.create({
        _id: id,
        email: email,
        password_hash: randomPassword,
        name: email.split('@')[0],
      });
      await BrandProfile.create({ user_id: id });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, default_platforms: user.default_platforms || [] },
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/google/client-id', async (req, res) => {
  try {
    const dbConfigGoogle = await PlatformConfig.findOne({ platform: 'google' }).lean().catch(() => null);

    const rawId = process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      dbConfigGoogle?.client_id ||
      null;

    const clientId = rawId ? String(rawId).trim().replace(/^["']|["']$/g, '') : null;
    res.json({ client_id: clientId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client ID' });
  }
});

router.put('/platforms', requireAuth, async (req, res) => {
  const { platforms } = req.body;
  if (!Array.isArray(platforms)) {
    return res.status(400).json({ error: 'platforms must be an array' });
  }
  await User.findByIdAndUpdate(req.userId, { default_platforms: platforms });
  res.json({ default_platforms: platforms });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select('email name default_platforms notification_preferences');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      default_platforms: user.default_platforms || [],
      notification_preferences: user.notification_preferences || {
        email_notifications: true,
        push_notifications: true,
        publish_alerts: true,
        campaign_updates: false,
        weekly_digest: false,
      },
    }
  });
});

// Update user profile (name, email)
router.put('/profile', requireAuth, async (req, res) => {
  const { name, email, currentPassword } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined && email !== user.email) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change email address' });
      }
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      // Check email isn't taken
      const existing = await User.findOne({ email, _id: { $ne: req.userId } });
      if (existing) return res.status(409).json({ error: 'Email is already in use' });
      update.email = email;
    }
    const updatedUser = await User.findByIdAndUpdate(req.userId, update, { returnDocument: 'after' }).select('email name');
    res.json({ user: { id: updatedUser._id, email: updatedUser.email, name: updatedUser.name } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Update notification preferences
router.put('/notification-preferences', requireAuth, async (req, res) => {
  const { email_notifications, push_notifications, publish_alerts, campaign_updates, weekly_digest } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.userId, {
      notification_preferences: {
        email_notifications: email_notifications ?? true,
        push_notifications: push_notifications ?? true,
        publish_alerts: publish_alerts ?? true,
        campaign_updates: campaign_updates ?? false,
        weekly_digest: weekly_digest ?? false,
      }
    }, { returnDocument: 'after' }).select('notification_preferences');
    res.json({ notification_preferences: user.notification_preferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Always return the same response to prevent email enumeration
  const user = await User.findOne({ email });
  if (!user) {
    // Return a generic success to avoid revealing whether the email exists
    return res.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

  user.reset_code = code;
  user.reset_code_expires_at = expiresAt;
  user.reset_code_attempts = 0;
  user.reset_code_locked_until = undefined;
  await user.save();

  // SECURITY: Never log or return the OTP in any response.
  // The code is ONLY sent via email. If SMTP is not configured, the reset fails safely.

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // SMTP not configured — fail with a consistent error shape (matching all other route errors)
    return res.status(503).json({
      error: 'Email service is not configured. Password reset by email is unavailable. Contact the administrator.',
    });
  }

  const nodemailer = require('nodemailer');
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Scripta Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Scripta Account Password Reset Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #edf2f7; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #4f46e5; margin-bottom: 16px; text-align: center;">Password Reset Verification</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your Scripta account. Please use the following 6-digit verification code to complete the reset process:</p>
          <div style="background: #f5f5ff; border: 1px solid #e0e0ff; padding: 16px; font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 6px; border-radius: 12px; width: 220px; color: #4f46e5; margin: 24px auto;">
            ${code}
          </div>
          <p>This verification code is valid for 15 minutes. If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 24px 0;" />
          <p style="font-size: 12px; color: #718096; text-align: center;">Best regards,<br/>Scripta Security Team</p>
        </div>
      `,
    });
  } catch (mailErr) {
    return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
  }

  res.json({
    success: true,
    message: 'If an account exists with this email, a reset code has been sent.',
  });
});

router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: 'Invalid verification code' }); // Don't reveal user existence
  }

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  // Per-account lockout: caps brute-forcing the 6-digit code beyond what the
  // generic IP rate limiter alone would allow (e.g. distributed IPs).
  if (user.reset_code_locked_until && user.reset_code_locked_until > new Date()) {
    return res.status(429).json({ error: 'Too many failed attempts. Please request a new code and try again later.' });
  }

  // Constant-time comparison to prevent timing attacks
  const storedCode = user.reset_code || '';
  const providedCode = String(code);
  const codesMatch = storedCode.length === providedCode.length &&
    crypto.timingSafeEqual(Buffer.from(storedCode), Buffer.from(providedCode));

  if (!codesMatch) {
    user.reset_code_attempts = (user.reset_code_attempts || 0) + 1;
    if (user.reset_code_attempts >= MAX_ATTEMPTS) {
      user.reset_code_locked_until = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  if (!user.reset_code_expires_at || user.reset_code_expires_at < new Date()) {
    return res.status(400).json({ error: 'Verification code has expired' });
  }

  // Update password hash
  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.password_hash = passwordHash;
  user.reset_code = undefined;
  user.reset_code_expires_at = undefined;
  user.reset_code_attempts = 0;
  user.reset_code_locked_until = undefined;
  await user.save();

  res.json({ success: true, message: 'Password has been reset successfully' });
});

// Need crypto for constant-time comparison above
const crypto = require('crypto');

module.exports = router;
