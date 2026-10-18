const jwt = require('jsonwebtoken')
const db  = require('../config/db')
require('dotenv').config()

// ── VERIFY TOKEN ──
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' })
  }

  // The JWT only proves who this user WAS at login time — it says nothing
  // about whether an admin has blocked them since. Without this check, a
  // user blocked by an admin could keep using the app fully until their
  // token naturally expires (up to 24h later), which defeats the point of
  // "Block User" being an immediate action.
  db.query('SELECT status FROM users WHERE id = ?', [decoded.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'Account no longer exists.' })
    }
    if (results[0].status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked.' })
    }
    req.user = decoded
    next()
  })
}

// ── VERIFY ADMIN ──
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' })
    }
    next()
  })
}

// ── VERIFY OWNER ──
const verifyOwner = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.user_type !== 'owner' && req.user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Business owners only.' })
    }
    next()
  })
}

module.exports = { verifyToken, verifyAdmin, verifyOwner }
