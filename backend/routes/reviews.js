const express  = require('express')
const router   = express.Router()
const { verifyToken } = require('../middleware/auth')
const {
  getReviews,
  addReview,
  deleteReview,
  reportReview,
} = require('../controllers/reviewController')

// GET /api/reviews/:businessId  — get all reviews for a business (public)
router.get('/:businessId', getReviews)

// POST /api/reviews/:businessId  — add review (logged in users only)
router.post('/:businessId', verifyToken, addReview)

// DELETE /api/reviews/:id  — delete review (own review or admin)
router.delete('/:id', verifyToken, deleteReview)

// POST /api/reviews/:id/report  — report a review
router.post('/:id/report', verifyToken, reportReview)

module.exports = router
