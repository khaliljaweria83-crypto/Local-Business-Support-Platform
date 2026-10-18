const db = require('../config/db')
const { sendNewReportAdminAlert } = require('../services/emailService')

// ── GET REVIEWS FOR A BUSINESS ──
const getReviews = (req, res) => {
  const { businessId } = req.params

  const query = `
    SELECT r.*, u.full_name AS user_name
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.business_id = ?
    ORDER BY r.created_at DESC
  `
  db.query(query, [businessId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── ADD REVIEW ──
const addReview = (req, res) => {
  const { businessId } = req.params
  const { rating, comment } = req.body

  if (!rating || !comment) {
    return res.status(400).json({ message: 'Rating and comment are required.' })
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' })
  }

  // Prevent an owner from reviewing their own business, and prevent
  // reviews on a business that isn't publicly live yet (still pending
  // admin approval, or rejected/suspended) — even if someone reaches it
  // by guessing/visiting the direct URL.
  const ownerCheckQuery = 'SELECT owner_id, status FROM businesses WHERE id = ?'
  db.query(ownerCheckQuery, [businessId], (err, ownerResults) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (ownerResults.length === 0) {
      return res.status(404).json({ message: 'Business not found.' })
    }
    if (ownerResults[0].status !== 'active') {
      return res.status(400).json({ message: 'This business is not live yet — reviews can only be added once it is approved.' })
    }
    if (ownerResults[0].owner_id === req.user.id) {
      return res.status(403).json({ message: 'You cannot review your own business.' })
    }

    // Check if user already reviewed this business
    const checkQuery = 'SELECT * FROM reviews WHERE user_id = ? AND business_id = ?'
    db.query(checkQuery, [req.user.id, businessId], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error.' })

      if (results.length > 0) {
        return res.status(409).json({ message: 'You have already reviewed this business.' })
      }

      // Insert review
      const insertQuery = `
        INSERT INTO reviews (user_id, business_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `
      db.query(insertQuery,
        [req.user.id, businessId, rating, comment],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Error adding review.' })

          // Update average rating in businesses table
          const updateRating = `
            UPDATE businesses
            SET average_rating = (
              SELECT AVG(rating) FROM reviews WHERE business_id = ?
            )
            WHERE id = ?
          `
          db.query(updateRating, [businessId, businessId], (err) => {
            if (err) console.error('Rating update error:', err)
          })

          res.status(201).json({
            message: 'Review submitted successfully!',
            reviewId: result.insertId,
          })
        }
      )
    })
  })
}

// ── DELETE REVIEW ──
const deleteReview = (req, res) => {
  const { id } = req.params

  // User can delete own review, admin can delete any
  const checkQuery = req.user.user_type === 'admin'
    ? 'SELECT * FROM reviews WHERE id = ?'
    : 'SELECT * FROM reviews WHERE id = ? AND user_id = ?'

  const checkParams = req.user.user_type === 'admin'
    ? [id]
    : [id, req.user.id]

  db.query(checkQuery, checkParams, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'Not authorized to delete this review.' })
    }

    const businessId = results[0].business_id

    db.query('DELETE FROM reviews WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ message: 'Error deleting review.' })

      // When an admin removes a review, keep a record of it in the audit log.
      if (req.user.user_type === 'admin') {
        db.query(
          `INSERT INTO admin_logs (admin_id, action, target_id, target_type, notes)
           VALUES (?, 'deleted_review', ?, 'review', ?)`,
          [req.user.id, id, `Review on business #${businessId}`],
          (logErr) => { if (logErr) console.error('Log error:', logErr) }
        )
      }

      // Recalculate the business's average rating now that a review is
      // gone — otherwise the stored average silently drifts from reality
      // every time a review is deleted (it was only ever updated on add).
      const updateRating = `
        UPDATE businesses
        SET average_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE business_id = ?), 0)
        WHERE id = ?
      `
      db.query(updateRating, [businessId, businessId], (err) => {
        if (err) console.error('Rating update error:', err)
      })

      res.status(200).json({ message: 'Review deleted successfully!' })
    })
  })
}

// ── REPORT REVIEW ──
const reportReview = (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Please provide a reason for the report.' })
  }

  // Make sure the review exists, and keep a snapshot of its text + business name
  // so the report still makes sense after the admin deletes the review.
  const findQuery = `
    SELECT rv.comment, b.name AS business_name
    FROM reviews rv LEFT JOIN businesses b ON rv.business_id = b.id
    WHERE rv.id = ?
  `
  db.query(findQuery, [id], (err, found) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (found.length === 0) return res.status(404).json({ message: 'Review not found.' })

    // Same person can't file the same report again while theirs is still pending.
    const dupQuery = `
      SELECT id FROM reports
      WHERE user_id = ? AND review_id = ? AND status = 'pending'
    `
    db.query(dupQuery, [req.user.id, id], (err, existing) => {
      if (err) return res.status(500).json({ message: 'Database error.' })
      if (existing.length > 0) {
        return res.status(409).json({ message: 'You have already reported this review.' })
      }

      const query = `
        INSERT INTO reports (user_id, review_id, reason, type, target_label, target_excerpt)
        VALUES (?, ?, ?, 'review', ?, ?)
      `
      const excerpt = (found[0].comment || '').slice(0, 250)
      db.query(query, [req.user.id, id, reason.trim(), found[0].business_name, excerpt], (err) => {
        if (err) return res.status(500).json({ message: 'Error reporting review.' })
        sendNewReportAdminAlert(reason, 'review')
        res.status(201).json({ message: 'Review reported successfully!' })
      })
    })
  })
}

module.exports = { getReviews, addReview, deleteReview, reportReview }
