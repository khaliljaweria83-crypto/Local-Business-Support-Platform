const express    = require('express')
const router     = express.Router()
const { verifyToken } = require('../middleware/auth')
const { authLimiter } = require('../middleware/rateLimiter')
const {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  sendRegistrationOtp,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController')

// POST /api/auth/register
router.post('/register', authLimiter, register)

// POST /api/auth/login
router.post('/login', authLimiter, login)

// GET /api/auth/profile  (protected)
router.get('/profile', verifyToken, getProfile)

// PUT /api/auth/profile  (protected)
router.put('/profile', verifyToken, updateProfile)

// POST /api/auth/send-registration-otp — step 1 of signup, verifies the email is real
router.post('/send-registration-otp', authLimiter, sendRegistrationOtp)

// POST /api/auth/verify-otp — shared step 2 for registration + password reset
router.post('/verify-otp', authLimiter, verifyOtp)

// POST /api/auth/forgot-password  — step 1 of password reset, sends an OTP
router.post('/forgot-password', authLimiter, forgotPassword)

// POST /api/auth/reset-password  — final step, sets the new password using the verified session token
router.post('/reset-password', authLimiter, resetPassword)

module.exports = router
