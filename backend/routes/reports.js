const express = require('express')
const router  = express.Router()
const { verifyToken } = require('../middleware/auth')
const { getMyReports } = require('../controllers/reportController')

// GET /api/reports/mine  — reports filed by the logged-in user (with admin decisions)
router.get('/mine', verifyToken, getMyReports)

module.exports = router
