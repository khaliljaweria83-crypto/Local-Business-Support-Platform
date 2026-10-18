const db = require('../config/db')

// ── GET ACTIVE PROMOTIONS FOR A BUSINESS (public) ──
const getPromotionsForBusiness = (req, res) => {
  const { businessId } = req.params
  const query = `
    SELECT * FROM promotions
    WHERE business_id = ? AND is_active = 1 AND end_date >= CURDATE()
    ORDER BY start_date DESC
  `
  db.query(query, [businessId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── GET ALL PROMOTIONS FOR OWNER'S OWN BUSINESSES ──
const getMyPromotions = (req, res) => {
  const query = `
    SELECT p.*, b.name AS business_name
    FROM promotions p
    JOIN businesses b ON p.business_id = b.id
    WHERE b.owner_id = ?
    ORDER BY p.created_at DESC
  `
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── ADD PROMOTION (owner only, must own the business) ──
const addPromotion = (req, res) => {
  const { business_id, title, description, start_date, end_date } = req.body

  if (!business_id || !title || !start_date || !end_date) {
    return res.status(400).json({ message: 'Business, title, start date and end date are required.' })
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ message: 'End date must be after start date.' })
  }

  // Confirm this business belongs to the requesting owner AND is already
  // approved. This must be enforced server-side, not just hidden in the
  // frontend dropdown — otherwise a direct API call could add a promotion
  // to a business that hasn't been approved yet.
  const checkQuery = 'SELECT id, status FROM businesses WHERE id = ? AND owner_id = ?'
  db.query(checkQuery, [business_id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'You can only add promotions to your own businesses.' })
    }
    if (results[0].status !== 'active') {
      return res.status(400).json({ message: 'Promotions can only be added to active (admin-approved) businesses.' })
    }

    const insertQuery = `
      INSERT INTO promotions (business_id, title, description, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `
    db.query(insertQuery, [business_id, title, description, start_date, end_date], (err, result) => {
      if (err) return res.status(500).json({ message: 'Error adding promotion.' })
      res.status(201).json({ message: 'Promotion added successfully!', promotionId: result.insertId })
    })
  })
}

// ── DELETE / DEACTIVATE PROMOTION ──
const deletePromotion = (req, res) => {
  const { id } = req.params

  const checkQuery = `
    SELECT p.id FROM promotions p
    JOIN businesses b ON p.business_id = b.id
    WHERE p.id = ? AND (b.owner_id = ? OR ? = 'admin')
  `
  db.query(checkQuery, [id, req.user.id, req.user.user_type], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'Not authorized to delete this promotion.' })
    }

    db.query('DELETE FROM promotions WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ message: 'Error deleting promotion.' })
      res.status(200).json({ message: 'Promotion deleted successfully!' })
    })
  })
}

module.exports = {
  getPromotionsForBusiness,
  getMyPromotions,
  addPromotion,
  deletePromotion,
}
