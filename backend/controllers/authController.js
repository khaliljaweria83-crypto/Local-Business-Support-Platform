const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const crypto = require('crypto')
const db     = require('../config/db')
const { sendPasswordResetEmail, sendOtpEmail, sendNewBusinessAdminAlert, isEmailConfigured } = require('../services/emailService')
require('dotenv').config()

// A password is "strong enough" only when it has ALL of: at least 8
// characters, a letter, a number, and a special character from the list
// below — and NO spaces (a space used to be wrongly counted as a "special
// character"). Blocks weak passwords like "123456" or "password". Used for
// both registration and password reset, and mirrored on the website
// (frontend/src/passwordRules.js) so the rule is the same everywhere.
const SPECIAL_CHAR = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/

const isStrongPassword = (pw) =>
  typeof pw === 'string' &&
  pw.length >= 8 &&
  !/\s/.test(pw) &&
  /[A-Za-z]/.test(pw) &&
  /[0-9]/.test(pw) &&
  SPECIAL_CHAR.test(pw)

const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters and include a letter, a number, and a special character (such as ! @ # $ % &), with no spaces.'

// ── OTP HELPERS ──
// Both registration email-verification and password-reset now go through
// the same 6-digit OTP mechanism (email_otps table) — this generates and
// stores one, keeping the "attempts" counter and expiry logic in one place
// so both flows behave identically.
const OTP_ENTRY_WINDOW_MIN     = 10 // how long the person has to type the OTP in
const OTP_VERIFIED_WINDOW_MIN  = 60 // how long a *verified* email/OTP stays usable afterwards (e.g. to finish the registration form, or to submit the new password)
const OTP_MAX_ATTEMPTS         = 5

// Development/demo fallback: when real email delivery isn't available, the OTP
// is returned in the API response so the flow can still be demonstrated.
// It is ON by default (same behaviour as before) — set ALLOW_DEV_OTP=false in
// .env to turn it off for a production-style setup with real email.
const ALLOW_DEV_OTP = process.env.ALLOW_DEV_OTP !== 'false'

// crypto.randomInt is cryptographically secure (Math.random is predictable).
const generateOtp = () => String(crypto.randomInt(100000, 1000000))

// Creates a fresh OTP row for (email, purpose), invalidating any earlier
// unverified ones for that same pair first so only the latest code works.
const issueOtp = (email, purpose, callback) => {
  const otp = generateOtp()
  const otpHash = bcrypt.hashSync(otp, 10)
  const expiresAt = new Date(Date.now() + OTP_ENTRY_WINDOW_MIN * 60 * 1000)

  db.query('DELETE FROM email_otps WHERE email = ? AND purpose = ? AND verified = 0', [email, purpose], (delErr) => {
    if (delErr) return callback(delErr)
    const insertQuery = `
      INSERT INTO email_otps (email, purpose, otp_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `
    db.query(insertQuery, [email, purpose, otpHash, expiresAt], async (insErr) => {
      if (insErr) return callback(insErr)
      // Always log the OTP server-side too — handy for demos/viva, and as a
      // fallback if the actual email send below fails for any reason.
      console.log(`🔐 OTP for ${email} (${purpose}): ${otp}`)
      const mailResult = await sendOtpEmail(email, otp, purpose)
      callback(null, otp, mailResult)
    })
  })
}

// ── REGISTER ──
const register = (req, res) => {
  const {
    full_name,
    email,
    password,
    user_type,
    business_name,
    category,
    city,
    phone,
    address,
  } = req.body

  // Validation
  if (!full_name || !email || !password || !user_type) {
    return res.status(400).json({ message: 'Please fill all required fields.' })
  }

  // Same strength rule as the Reset Password flow — a weak password should
  // never be accepted at registration either.
  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: PASSWORD_RULE_MESSAGE })
  }

  if (user_type === 'admin') {
    return res.status(403).json({ message: 'Admin accounts cannot be created here.' })
  }

  // Only the two public account types are allowed — anything else is rejected
  // here instead of failing later with a confusing database error.
  if (!['customer', 'owner'].includes(user_type)) {
    return res.status(400).json({ message: 'Invalid account type.' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' })
  }

  // The email must have been verified via the OTP flow first (see
  // sendRegistrationOtp / verifyOtp below) — sir's fix for people typing in
  // a fake/unreachable email at registration. The verified window is kept
  // fairly short (OTP_VERIFIED_WINDOW_MIN) so a check from an hour ago
  // can't be reused indefinitely.
  const checkVerified = `
    SELECT id FROM email_otps
    WHERE email = ? AND purpose = 'registration' AND verified = 1 AND expires_at > NOW()
    ORDER BY id DESC LIMIT 1
  `
  db.query(checkVerified, [email], (vErr, vResults) => {
    if (vErr) { console.error('DB error:', vErr); return res.status(500).json({ message: 'Database error.' }) }
    if (vResults.length === 0) {
      return res.status(400).json({ message: 'Please verify your email with the OTP sent to it before registering.' })
    }

    proceedWithRegistration()
  })

  function proceedWithRegistration() {
  // Check if email already exists
  const checkEmail = 'SELECT * FROM users WHERE email = ?'
  db.query(checkEmail, [email], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }

    if (results.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' })
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10)

    // Insert user
    const insertUser = `
      INSERT INTO users (full_name, email, password, user_type)
      VALUES (?, ?, ?, ?)
    `
    db.query(insertUser, [full_name, email, hashedPassword, user_type], (err, result) => {
      if (err) return res.status(500).json({ message: 'Error creating user.' })

      const userId = result.insertId

      // Registration OTP has done its job — clear it out so it can't be reused.
      db.query('DELETE FROM email_otps WHERE email = ? AND purpose = \'registration\'', [email], () => {})

      // If owner — also save business info (only if enough info was given
      // to make a usable listing; a bare business_name with no category/
      // address would violate the businesses table constraints or leave a
      // broken, unfilterable listing).
      if (user_type === 'owner' && business_name && category && city && address) {
        const insertBusiness = `
          INSERT INTO businesses
          (owner_id, name, category, city, address, phone, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `
        db.query(insertBusiness,
          [userId, business_name, category, city, address, phone],
          (err) => {
            if (err) return console.error('Business insert error:', err)
            // Same alert an owner adding a business later from their
            // dashboard already triggers (see businessController.js) — a
            // business submitted at signup time sits in the exact same
            // Pending Approvals queue, so the admin needs to know about it
            // just as promptly.
            sendNewBusinessAdminAlert(business_name, full_name || email)
          }
        )
      }

      res.status(201).json({
        message: 'Account created successfully!',
        user: { id: userId, full_name, email, user_type },
      })
    })
  })
  }
}

// ── LOGIN ──
const login = (req, res) => {
  const { email, password, user_type } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  const query = 'SELECT * FROM users WHERE email = ?'
  db.query(query, [email], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const user = results[0]

    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked.' })
    }

    // Check password
    const isMatch = bcrypt.compareSync(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' })
    }

    // Check role match
    if (user_type && user.user_type !== user_type) {
      return res.status(403).json({
        message: `This account is registered as ${user.user_type}, not ${user_type}.`,
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id:        user.id,
        email:     user.email,
        user_type: user.user_type,
        full_name: user.full_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
        user_type: user.user_type,
      },
    })
  })
}

// ── GET PROFILE ──
const getProfile = (req, res) => {
  const query = 'SELECT id, full_name, email, user_type, phone, created_at FROM users WHERE id = ?'
  db.query(query, [req.user.id], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }
    if (results.length === 0) return res.status(404).json({ message: 'User not found.' })
    res.status(200).json(results[0])
  })
}

// ── UPDATE PROFILE ──
const updateProfile = (req, res) => {
  const { full_name, phone } = req.body

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ message: 'Full name is required.' })
  }

  const query = 'UPDATE users SET full_name = ?, phone = ? WHERE id = ?'
  db.query(query, [full_name, phone, req.user.id], (err) => {
    if (err) return res.status(500).json({ message: 'Error updating profile.' })
    res.status(200).json({ message: 'Profile updated successfully!' })
  })
}

// ── FORGOT PASSWORD (step 1 — send an OTP to the account email) ──
const forgotPassword = (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required.' })

  const query = 'SELECT id, full_name FROM users WHERE email = ?'
  db.query(query, [email], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }

    // Always respond with the same generic message whether or not the
    // email exists — this avoids leaking which emails are registered.
    const genericResponse = { message: 'If an account exists for that email, a 6-digit code has been sent to it.' }

    if (results.length === 0) {
      return res.status(200).json(genericResponse)
    }

    issueOtp(email, 'password_reset', (otpErr, otp, mailResult) => {
      if (otpErr) { console.error('DB error:', otpErr); return res.status(500).json({ message: 'Database error.' }) }

      // Show the code directly in the response as a fallback whenever it
      // genuinely wasn't delivered by real email — either because Gmail
      // isn't configured at all, OR it IS configured but the actual send
      // failed (wrong App Password, Gmail rejected it, etc.). Without this,
      // a broken email setup would silently lock people out with no way to
      // get their code.
      if (mailResult.sent || !ALLOW_DEV_OTP) {
        return res.status(200).json(genericResponse)
      }
      const reason = isEmailConfigured
        ? ' (the server tried to email it but the send failed — check the backend terminal for the reason)'
        : ' (email sending is not configured on this server yet)'
      res.status(200).json({ ...genericResponse, devOtp: otp, devNote: `Showing the code directly${reason}.` })
    })
  })
}

// ── SEND REGISTRATION OTP (step 1 of signup — verify the email is real/reachable) ──
const sendRegistrationOtp = (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required.' })

  const checkEmail = 'SELECT id FROM users WHERE email = ?'
  db.query(checkEmail, [email], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }
    if (results.length > 0) {
      return res.status(409).json({ message: 'This email is already registered. Try logging in instead.' })
    }

    issueOtp(email, 'registration', (otpErr, otp, mailResult) => {
      if (otpErr) { console.error('DB error:', otpErr); return res.status(500).json({ message: 'Database error.' }) }
      const response = { message: `A 6-digit verification code has been sent to ${email}.` }
      if (mailResult.sent || !ALLOW_DEV_OTP) {
        return res.status(200).json(response)
      }
      const reason = isEmailConfigured
        ? ' (the server tried to email it but the send failed — check the backend terminal for the reason)'
        : ' (email sending is not configured on this server yet)'
      res.status(200).json({ ...response, devOtp: otp, devNote: `Showing the code directly${reason}.` })
    })
  })
}

// ── VERIFY OTP (shared step 2 — for both registration and password reset) ──
const verifyOtp = (req, res) => {
  const { email, otp, purpose } = req.body
  if (!email || !otp || !purpose) {
    return res.status(400).json({ message: 'Email, OTP and purpose are required.' })
  }
  if (!['registration', 'password_reset'].includes(purpose)) {
    return res.status(400).json({ message: 'Invalid OTP purpose.' })
  }

  const query = `
    SELECT * FROM email_otps
    WHERE email = ? AND purpose = ? AND verified = 0
    ORDER BY id DESC LIMIT 1
  `
  db.query(query, [email, purpose], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }

    if (results.length === 0) {
      return res.status(400).json({ message: 'No pending code for this email. Please request a new one.' })
    }

    const row = results[0]

    if (new Date(row.expires_at) < new Date()) {
      db.query('DELETE FROM email_otps WHERE id = ?', [row.id], () => {})
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' })
    }

    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      db.query('DELETE FROM email_otps WHERE id = ?', [row.id], () => {})
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new code.' })
    }

    const isMatch = bcrypt.compareSync(String(otp), row.otp_hash)
    if (!isMatch) {
      db.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id], () => {})
      return res.status(400).json({ message: 'Incorrect code. Please check and try again.' })
    }

    // Correct — mark verified, and extend the expiry so the person has a
    // reasonable window to finish the rest of the flow (typing the new
    // password, or filling in the rest of the registration form).
    const verifiedUntil = new Date(Date.now() + OTP_VERIFIED_WINDOW_MIN * 60 * 1000)
    db.query('UPDATE email_otps SET verified = 1, expires_at = ? WHERE id = ?', [verifiedUntil, row.id], (updErr) => {
      if (updErr) { console.error('DB error:', updErr); return res.status(500).json({ message: 'Database error.' }) }

      if (purpose === 'registration') {
        return res.status(200).json({ message: 'Email verified successfully.' })
      }

      // purpose === 'password_reset' — issue the actual reset token now,
      // reusing the same users.reset_token mechanism resetPassword() already
      // checks, so that endpoint doesn't need to change at all.
      const resetToken = crypto.randomBytes(32).toString('hex')
      const tokenExpiry = new Date(Date.now() + OTP_VERIFIED_WINDOW_MIN * 60 * 1000)
      db.query('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?', [resetToken, tokenExpiry, email], (tokErr) => {
        if (tokErr) { console.error('DB error:', tokErr); return res.status(500).json({ message: 'Database error.' }) }
        res.status(200).json({ message: 'Code verified.', resetToken })
      })
    })
  })
}

// ── RESET PASSWORD (final step — using the token issued after OTP verification) ──
const resetPassword = (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required.' })
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ message: PASSWORD_RULE_MESSAGE })
  }

  const query = 'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()'
  db.query(query, [token], (err, results) => {
    if (err) { console.error('DB error:', err); return res.status(500).json({ message: 'Database error.' }) }
    if (results.length === 0) {
      return res.status(400).json({ message: 'This reset session is invalid or has expired. Please request a new code.' })
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10)
    const updateQuery = 'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?'
    db.query(updateQuery, [hashedPassword, results[0].id], (err) => {
      if (err) return res.status(500).json({ message: 'Error resetting password.' })
      res.status(200).json({ message: 'Password reset successfully! You can now login with your new password.' })
    })
  })
}

module.exports = { register, login, getProfile, updateProfile, forgotPassword, sendRegistrationOtp, verifyOtp, resetPassword }
