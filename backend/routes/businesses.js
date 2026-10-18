const express  = require('express')
const router   = express.Router()
const { verifyToken, verifyOwner } = require('../middleware/auth')
const {
  getAllBusinesses,
  getBusinessById,
  addBusiness,
  updateBusiness,
  deleteBusiness,
  getMyBusinesses,
  reportBusiness,
  uploadPhoto,
} = require('../controllers/businessController')
const upload = require('../middleware/upload')

// GET /api/businesses  — all active businesses (public)
router.get('/', getAllBusinesses)

// GET /api/businesses/my  — owner's own businesses (protected)
router.get('/my', verifyOwner, getMyBusinesses)

// GET /api/businesses/:id  — single business (public)
router.get('/:id', getBusinessById)

// POST /api/businesses  — add new business (owner only)
router.post('/', verifyOwner, addBusiness)

// PUT /api/businesses/:id  — update business (owner only)
router.put('/:id', verifyOwner, updateBusiness)

// DELETE /api/businesses/:id  — delete business (owner only)
router.delete('/:id', verifyOwner, deleteBusiness)

// POST /api/businesses/:id/report  — report a listing (any logged-in user)
router.post('/:id/report', verifyToken, reportBusiness)

// POST /api/businesses/:id/photo  — upload a live photo (owner only, own business)
router.post('/:id/photo', verifyOwner, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      // Surface multer's specific errors (file too large, wrong type)
      // instead of falling through to the generic 500 error handler.
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Photo is too large — max size is 5MB.'
        : err.message || 'Photo upload failed.'
      return res.status(400).json({ message })
    }
    next()
  })
}, uploadPhoto)

module.exports = router
