// ============================================
// Simple in-memory rate limiter (no extra npm package needed).
// Used on the login / register / OTP / password-reset routes so one IP
// can't hammer them (password guessing, OTP guessing, email bombing).
// Counters live in server memory, so restarting the backend resets them.
// ============================================

const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 30, message } = {}) => {
  const hits = new Map() // ip -> { count, resetAt }

  // Clean out expired entries now and then so the Map can't grow forever.
  setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip)
    }
  }, windowMs).unref()

  return (req, res, next) => {
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'
    const now = Date.now()
    let entry = hits.get(ip)

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(ip, entry)
    }

    entry.count += 1

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfterSec))
      return res.status(429).json({
        message: message || 'Too many attempts. Please try again after a few minutes.',
      })
    }

    next()
  }
}

// 30 attempts per 15 minutes per IP — plenty for normal use.
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many attempts. Please try again after 15 minutes.',
})

module.exports = { createRateLimiter, authLimiter }
