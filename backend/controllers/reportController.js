const db = require('../config/db')

// ── GET MY REPORTS ──
// Lets any logged-in user see the reports THEY filed, with the admin's decision
// and the explanation the admin wrote (shown under "My Reports" on the profile page).
const getMyReports = (req, res) => {
  const query = `
    SELECT rp.id, rp.type, rp.reason, rp.status, rp.admin_response,
           rp.created_at, rp.resolved_at,
           COALESCE(b.name, rb.name, rp.target_label) AS target_name,
           COALESCE(rv.comment, rp.target_excerpt)    AS review_comment
    FROM reports rp
    LEFT JOIN businesses b  ON rp.business_id = b.id
    LEFT JOIN reviews rv    ON rp.review_id = rv.id
    LEFT JOIN businesses rb ON rv.business_id = rb.id
    WHERE rp.user_id = ?
    ORDER BY rp.created_at DESC
  `
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

module.exports = { getMyReports }
