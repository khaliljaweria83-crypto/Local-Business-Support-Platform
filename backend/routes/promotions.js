const express = require('express')
const router  = express.Router()
const { verifyToken, verifyOwner } = require('../middleware/auth')
const {
  getPromotionsForBusiness,
  getMyPromotions,
  addPromotion,
  deletePromotion,
} = require('../controllers/promotionController')

// GET /api/promotions/mine  — owner's own promotions (protected)
router.get('/mine', verifyOwner, getMyPromotions)

// GET /api/promotions/business/:businessId  — active promotions for a business (public)
router.get('/business/:businessId', getPromotionsForBusiness)

// POST /api/promotions  — add a promotion (owner only)
router.post('/', verifyOwner, addPromotion)

// DELETE /api/promotions/:id  — delete a promotion (owner or admin)
router.delete('/:id', verifyToken, deletePromotion)

module.exports = router
