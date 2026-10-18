const express  = require('express')
const router   = express.Router()
const { verifyAdmin } = require('../middleware/auth')
const {
  getDashboardStats,
  getPendingBusinesses,
  approveBusiness,
  rejectBusiness,
  suspendBusiness,
  getAllBusinessesAdmin,
  getAllUsers,
  blockUser,
  unblockUser,
  getAllReports,
  dismissReport,
  resolveReport,
  getAdminLogs,
} = require('../controllers/adminController')

// GET /api/admin/stats  — dashboard stats
router.get('/stats', verifyAdmin, getDashboardStats)

// GET /api/admin/businesses  — all businesses
router.get('/businesses', verifyAdmin, getAllBusinessesAdmin)

// GET /api/admin/businesses/pending  — pending businesses
router.get('/businesses/pending', verifyAdmin, getPendingBusinesses)

// POST /api/admin/businesses/:id/approve  — approve business
router.post('/businesses/:id/approve', verifyAdmin, approveBusiness)

// POST /api/admin/businesses/:id/reject  — reject business
router.post('/businesses/:id/reject', verifyAdmin, rejectBusiness)

// POST /api/admin/businesses/:id/suspend  — suspend business
router.post('/businesses/:id/suspend', verifyAdmin, suspendBusiness)

// GET /api/admin/users  — all users
router.get('/users', verifyAdmin, getAllUsers)

// POST /api/admin/users/:id/block  — block user
router.post('/users/:id/block', verifyAdmin, blockUser)

// POST /api/admin/users/:id/unblock  — unblock user
router.post('/users/:id/unblock', verifyAdmin, unblockUser)

// GET /api/admin/reports  — all reports
router.get('/reports', verifyAdmin, getAllReports)

// POST /api/admin/reports/:id/dismiss  — dismiss report
router.post('/reports/:id/dismiss', verifyAdmin, dismissReport)

// POST /api/admin/reports/:id/resolve  — mark report resolved after taking action
router.post('/reports/:id/resolve', verifyAdmin, resolveReport)

// GET /api/admin/logs  — recent admin activity (audit trail)
router.get('/logs', verifyAdmin, getAdminLogs)

module.exports = router
