const db = require('../config/db')
const { sendBusinessApprovedEmail, sendBusinessRejectedEmail, sendNewReportAdminAlert, sendReportOutcomeEmail } = require('../services/emailService')

// Every admin decision (approve / reject / suspend / resolve / dismiss) must come
// with a written explanation, so the owner or the person who reported can see WHY.
const MIN_REASON_LENGTH = 5
const cleanText = (v, max = 500) => (v == null ? '' : String(v)).trim().slice(0, max)

// Emails the person who filed a report with the admin's decision + explanation.
// (The same text is also shown inside the app under "My Reports".)
const notifyReporter = (reportId, outcome, response) => {
  const q = `
    SELECT u.email, rp.type,
           COALESCE(b.name, rb.name, rp.target_label) AS target_name
    FROM reports rp
    JOIN users u ON rp.user_id = u.id
    LEFT JOIN businesses b ON rp.business_id = b.id
    LEFT JOIN reviews rv ON rp.review_id = rv.id
    LEFT JOIN businesses rb ON rv.business_id = rb.id
    WHERE rp.id = ?
  `
  db.query(q, [reportId], (err, rows) => {
    if (err || !Array.isArray(rows) || rows.length === 0) return
    sendReportOutcomeEmail(rows[0].email, rows[0].type, rows[0].target_name, outcome, response)
  })
}

// ── Helper: write one entry to admin_logs (audit trail of admin actions) ──
const logAdminAction = (adminId, action, targetId, targetType, notes = null) => {
  const q = `
    INSERT INTO admin_logs (admin_id, action, target_id, target_type, notes)
    VALUES (?, ?, ?, ?, ?)
  `
  db.query(q, [adminId, action, targetId, targetType, notes], (err) => {
    if (err) console.error('Admin log error:', err)
  })
}

// ── GET DASHBOARD STATS ──
const getDashboardStats = (req, res) => {
  const queries = {
    totalBusinesses: 'SELECT COUNT(*) AS count FROM businesses',
    totalUsers:      'SELECT COUNT(*) AS count FROM users WHERE user_type != "admin"',
    pendingApprovals:'SELECT COUNT(*) AS count FROM businesses WHERE status = "pending"',
    totalReviews:    'SELECT COUNT(*) AS count FROM reviews',
    avgRating:       'SELECT ROUND(AVG(rating), 1) AS avg FROM reviews',
    totalReports:    'SELECT COUNT(*) AS count FROM reports WHERE status = "pending"',
  }

  const stats = {}
  let completed = 0
  const total = Object.keys(queries).length

  Object.entries(queries).forEach(([key, query]) => {
    db.query(query, (err, results) => {
      if (!err) {
        stats[key] = results[0].count || results[0].avg || 0
      }
      completed++
      if (completed === total) {
        res.status(200).json(stats)
      }
    })
  })
}

// ── GET ALL PENDING BUSINESSES ──
const getPendingBusinesses = (req, res) => {
  // owner_phone is included here so the admin can actually call the owner
  // and verify the listing before approving/rejecting it — the table only
  // had owner_name/owner_email before, with no way to reach them directly.
  const query = `
    SELECT b.*, u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
    FROM businesses b
    LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.status = 'pending'
    ORDER BY b.created_at DESC, b.id DESC
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── APPROVE BUSINESS ──
const approveBusiness = (req, res) => {
  const { id } = req.params
  const note = cleanText(req.body && req.body.note)
  if (note.length < MIN_REASON_LENGTH) {
    return res.status(400).json({ message: 'Please write a short note for the owner explaining the approval.' })
  }

  const infoQuery = `
    SELECT b.name, b.status, u.email AS owner_email
    FROM businesses b LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.id = ?
  `
  db.query(infoQuery, [id], (err, info) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (info.length === 0) return res.status(404).json({ message: 'Business not found.' })

    // Pending / rejected / suspended listings can be (re)activated, but an
    // already-active one needs no approval.
    if (info[0].status === 'active') {
      return res.status(400).json({ message: 'This business is already active.' })
    }

    const query = `
      UPDATE businesses
      SET status = 'active', is_verified = 1, rejection_reason = NULL, approval_note = ?
      WHERE id = ?
    `
    db.query(query, [note, id], (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error.' })
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Business not found.' })
      }

      // Log admin action
      const logQuery = `
        INSERT INTO admin_logs (admin_id, action, target_id, target_type, notes)
        VALUES (?, 'approved_business', ?, 'business', ?)
      `
      db.query(logQuery, [req.user.id, id, note], (err) => {
        if (err) console.error('Log error:', err)
      })

      sendBusinessApprovedEmail(info[0].owner_email, info[0].name, note)

      res.status(200).json({ message: 'Business approved successfully!' })
    })
  })
}

// ── REJECT BUSINESS ──
const rejectBusiness = (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  // Stored on the business so the owner can see WHY it was rejected.
  const cleanReason = cleanText(reason)
  if (cleanReason.length < MIN_REASON_LENGTH) {
    return res.status(400).json({ message: 'Please write a reason for the rejection (at least 5 characters).' })
  }

  const infoQuery = `
    SELECT b.name, b.status, u.email AS owner_email
    FROM businesses b LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.id = ?
  `
  db.query(infoQuery, [id], (err, info) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (info.length === 0) return res.status(404).json({ message: 'Business not found.' })

    if (info[0].status !== 'pending') {
      return res.status(400).json({ message: 'Only pending businesses can be rejected.' })
    }

    const query = `
      UPDATE businesses
      SET status = 'rejected', rejection_reason = ?, approval_note = NULL
      WHERE id = ?
    `
    db.query(query, [cleanReason, id], (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error.' })
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Business not found.' })
      }

      // Log admin action
      const logQuery = `
        INSERT INTO admin_logs (admin_id, action, target_id, target_type, notes)
        VALUES (?, 'rejected_business', ?, 'business', ?)
      `
      db.query(logQuery, [req.user.id, id, cleanReason], (err) => {
        if (err) console.error('Log error:', err)
      })

      sendBusinessRejectedEmail(info[0].owner_email, info[0].name, cleanReason)

      res.status(200).json({ message: 'Business rejected.' })
    })
  })
}

// ── SUSPEND BUSINESS ──
const suspendBusiness = (req, res) => {
  const { id } = req.params
  const reason = cleanText(req.body && req.body.reason)
  if (reason.length < MIN_REASON_LENGTH) {
    return res.status(400).json({ message: 'Please write a reason for the suspension (at least 5 characters).' })
  }

  // The reason is kept on the listing so the owner can see why it was suspended.
  const query = `
    UPDATE businesses
    SET status = 'suspended', rejection_reason = ?, approval_note = NULL
    WHERE id = ?
  `
  db.query(query, [reason, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Business not found.' })
    }

    // The business is suspended now, so any other still-pending reports
    // against it are settled too — close them (with a standard explanation)
    // instead of leaving duplicate "Suspend" buttons on a suspended business.
    const closeReports = `
      UPDATE reports
      SET status = 'reviewed', resolved_at = NOW(),
          admin_response = 'Action taken: this listing has been suspended by the admin.'
      WHERE business_id = ? AND status = 'pending'
    `
    db.query(closeReports, [id], (err, repResult) => {
      if (err) console.error('Auto-close reports error:', err)
      const closed = repResult ? repResult.affectedRows : 0

      logAdminAction(
        req.user.id, 'suspended_business', id, 'business',
        `${reason} (${closed} pending report(s) auto-closed)`
      )
      res.status(200).json({ message: 'Business suspended.' })
    })
  })
}

// ── GET ALL BUSINESSES (Admin View) ──
const getAllBusinessesAdmin = (req, res) => {
  const query = `
    SELECT b.*, u.full_name AS owner_name,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.id) AS review_count
    FROM businesses b
    LEFT JOIN users u ON b.owner_id = u.id
    LEFT JOIN reviews r ON b.id = r.business_id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── GET ALL USERS ──
// Admin accounts are intentionally excluded here — this list is for
// moderating customers/owners, not for admins to block one another
// (or themselves).
const getAllUsers = (req, res) => {
  const query = `
    SELECT id, full_name, email, user_type, phone, status, created_at
    FROM users
    WHERE user_type != 'admin'
    ORDER BY created_at DESC
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── BLOCK USER ──
const blockUser = (req, res) => {
  const { id } = req.params

  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ message: 'You cannot block your own account.' })
  }

  const checkQuery = 'SELECT user_type FROM users WHERE id = ?'
  db.query(checkQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) return res.status(404).json({ message: 'User not found.' })
    if (results[0].user_type === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be blocked.' })
    }

    db.query(`UPDATE users SET status = 'blocked' WHERE id = ?`, [id], (err) => {
      if (err) return res.status(500).json({ message: 'Database error.' })

      // A blocked owner's businesses shouldn't stay live in the public
      // directory — suspend them too. (Left suspended on unblock; admin
      // reviews and reactivates each listing explicitly via All Businesses.)
      if (results[0].user_type === 'owner') {
        db.query(`UPDATE businesses SET status = 'suspended', rejection_reason = 'The owner account was blocked by the admin.', approval_note = NULL WHERE owner_id = ? AND status = 'active'`, [id], (err) => {
          if (err) console.error('Cascade suspend error:', err)
        })
      }

      res.status(200).json({ message: 'User blocked successfully.' })
    })
  })
}

// ── UNBLOCK USER ──
const unblockUser = (req, res) => {
  const { id } = req.params

  const query = `UPDATE users SET status = 'active' WHERE id = ?`
  db.query(query, [id], (err) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json({ message: 'User unblocked successfully.' })
  })
}

// ── GET ALL REPORTS ──
const getAllReports = (req, res) => {
  const query = `
    SELECT rp.*, u.full_name AS reporter_name,
    COALESCE(b.name, rb.name, rp.target_label) AS business_name,
    COALESCE(rv.comment, rp.target_excerpt) AS review_comment
    FROM reports rp
    LEFT JOIN users u ON rp.user_id = u.id
    LEFT JOIN businesses b ON rp.business_id = b.id
    LEFT JOIN reviews rv ON rp.review_id = rv.id
    LEFT JOIN businesses rb ON rv.business_id = rb.id
    ORDER BY rp.created_at DESC
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── DISMISS REPORT (no action taken) ──
const dismissReport = (req, res) => {
  const { id } = req.params
  const response = cleanText(req.body && req.body.response)
  if (response.length < MIN_REASON_LENGTH) {
    return res.status(400).json({ message: 'Please explain why this report is being dismissed (at least 5 characters).' })
  }

  const query = `
    UPDATE reports
    SET status = 'dismissed', admin_response = ?, resolved_at = NOW()
    WHERE id = ? AND status = 'pending'
  `
  db.query(query, [response, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'This report was not found or has already been handled.' })
    }
    logAdminAction(req.user.id, 'dismissed_report', id, 'report', response)
    notifyReporter(id, 'dismissed', response)
    res.status(200).json({ message: 'Report dismissed.' })
  })
}

// ── RESOLVE REPORT (admin took action on the reported content) ──
const resolveReport = (req, res) => {
  const { id } = req.params
  const response = cleanText(req.body && req.body.response)
  if (response.length < MIN_REASON_LENGTH) {
    return res.status(400).json({ message: 'Please explain what action was taken (at least 5 characters).' })
  }

  // No "status = pending" condition on purpose: suspending a business already
  // closes its reports automatically, and this call then attaches the admin's
  // own explanation to the one they clicked.
  const query = `
    UPDATE reports
    SET status = 'reviewed', admin_response = ?, resolved_at = NOW()
    WHERE id = ?
  `
  db.query(query, [response, id], (err) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    logAdminAction(req.user.id, 'resolved_report', id, 'report', response)
    notifyReporter(id, 'reviewed', response)
    res.status(200).json({ message: 'Report marked as resolved.' })
  })
}

// ── GET ADMIN ACTIVITY LOGS (latest 100 admin actions) ──
const getAdminLogs = (req, res) => {
  const query = `
    SELECT l.id, l.action, l.target_type, l.target_id, l.notes, l.created_at,
           u.full_name AS admin_name,
           b.name AS target_name
    FROM admin_logs l
    LEFT JOIN users u ON l.admin_id = u.id
    LEFT JOIN businesses b ON l.target_type = 'business' AND l.target_id = b.id
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT 100
  `
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

module.exports = {
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
}
