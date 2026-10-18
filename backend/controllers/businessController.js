const db = require('../config/db')
const jwt = require('jsonwebtoken')
const { geocodeAddress } = require('../services/geocodeService')
const { sendNewBusinessAdminAlert, sendNewReportAdminAlert } = require('../services/emailService')

// ── GET ALL BUSINESSES (Search + Filter) ──
const getAllBusinesses = (req, res) => {
  const { search, category, city, verified } = req.query

  let query = `
    SELECT b.*, u.full_name AS owner_name,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.id) AS review_count
    FROM businesses b
    LEFT JOIN users u ON b.owner_id = u.id
    LEFT JOIN reviews r ON b.id = r.business_id
    WHERE b.status = 'active'
  `
  const params = []

  if (search) {
    query += ' AND (b.name LIKE ? OR b.category LIKE ? OR b.address LIKE ? OR b.city LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  if (category && category !== 'All') {
    query += ' AND b.category = ?'
    params.push(category)
  }

  if (city && city !== 'All') {
    query += ' AND b.city = ?'
    params.push(city)
  }

  if (verified === 'true') {
    query += ' AND b.is_verified = 1'
  }

  query += ' GROUP BY b.id ORDER BY b.created_at DESC'

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── GET SINGLE BUSINESS ──
const getBusinessById = (req, res) => {
  const { id } = req.params

  const query = `
    SELECT b.*, u.full_name AS owner_name,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.id) AS review_count
    FROM businesses b
    LEFT JOIN users u ON b.owner_id = u.id
    LEFT JOIN reviews r ON b.id = r.business_id
    WHERE b.id = ?
    GROUP BY b.id
  `
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) return res.status(404).json({ message: 'Business not found.' })

    const business = results[0]

    // A listing that isn't 'active' (pending / rejected / suspended) is not
    // public. Its full details are only returned to its owner or an admin;
    // everyone else just gets the name + status so the page can show a
    // "not public" notice without leaking the listing's data.
    if (business.status !== 'active') {
      let viewer = null
      const token = (req.headers['authorization'] || '').split(' ')[1]
      if (token) {
        try { viewer = jwt.verify(token, process.env.JWT_SECRET) } catch (e) { viewer = null }
      }
      const canSee = viewer && (
        viewer.user_type === 'admin' || Number(viewer.id) === Number(business.owner_id)
      )
      if (!canSee) {
        return res.status(200).json({
          id: business.id,
          name: business.name,
          category: business.category,
          status: business.status,
        })
      }
    }

    res.status(200).json(business)
  })
}

// ── ADD BUSINESS ──
const addBusiness = async (req, res) => {
  const {
    name, category, city, address,
    phone, description, hours,
  } = req.body

  if (!name || !category || !city || !address) {
    return res.status(400).json({ message: 'Name, category, city and address are required.' })
  }

  // Convert the address into map coordinates (see services/geocodeService.js).
  // If geocoding fails for any reason, the business is still saved — it
  // just won't have a pin on the map until an admin/owner corrects it.
  const coords = await geocodeAddress(address, city)

  const query = `
    INSERT INTO businesses
    (owner_id, name, category, city, address, phone, description, hours, latitude, longitude, status, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
  `
  db.query(query,
    [req.user.id, name, category, city, address, phone, description, hours, coords?.latitude ?? null, coords?.longitude ?? null],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Error adding business.' })

      sendNewBusinessAdminAlert(name, req.user.full_name || req.user.email)

      res.status(201).json({
        message: 'Business submitted for verification!',
        businessId: result.insertId,
        geocoded: !!coords,
      })
    }
  )
}

// ── UPDATE BUSINESS ──
const updateBusiness = async (req, res) => {
  const { id } = req.params
  const { name, category, city, address, phone, description, hours } = req.body

  // Owners can only touch their own listings; admins can edit any listing.
  const checkQuery = req.user.user_type === 'admin'
    ? 'SELECT * FROM businesses WHERE id = ?'
    : 'SELECT * FROM businesses WHERE id = ? AND owner_id = ?'
  const checkParams = req.user.user_type === 'admin' ? [id] : [id, req.user.id]

  db.query(checkQuery, checkParams, async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'Not authorized to edit this business.' })
    }

    const business = results[0]
    // If an owner edits a listing that was rejected or suspended, treat the
    // edit as a resubmission — send it back into the approval queue rather
    // than leaving it permanently rejected/suspended with no way back.
    const shouldResubmit = req.user.user_type !== 'admin' &&
      (business.status === 'rejected' || business.status === 'suspended')

    // Re-geocode only if the address or city actually changed, to avoid
    // hitting the free geocoding service on every unrelated edit.
    let coords = { latitude: business.latitude, longitude: business.longitude }
    if ((address && address !== business.address) || (city && city !== business.city)) {
      const geocoded = await geocodeAddress(address, city || business.city)
      if (geocoded) coords = geocoded
    }

    const updateQuery = shouldResubmit
      ? `UPDATE businesses
         SET name=?, category=?, city=?, address=?, phone=?, description=?, hours=?, latitude=?, longitude=?, status='pending', is_verified=0, rejection_reason=NULL, approval_note=NULL
         WHERE id=?`
      : `UPDATE businesses
         SET name=?, category=?, city=?, address=?, phone=?, description=?, hours=?, latitude=?, longitude=?
         WHERE id=?`

    db.query(updateQuery,
      [name, category, city, address, phone, description, hours, coords.latitude, coords.longitude, id],
      (err) => {
        if (err) return res.status(500).json({ message: 'Error updating business.' })

        // A resubmission is exactly as urgent to the admin as a brand-new
        // listing (it's sitting in the same Pending Approvals queue) — alert
        // them the same way, so it isn't only discoverable by happening to
        // check the tab.
        if (shouldResubmit) {
          sendNewBusinessAdminAlert(name, req.user.full_name || req.user.email)
        }

        res.status(200).json({
          message: shouldResubmit
            ? 'Business updated and resubmitted for admin review.'
            : 'Business updated successfully!',
        })
      }
    )
  })
}

// ── DELETE BUSINESS ──
const deleteBusiness = (req, res) => {
  const { id } = req.params

  const checkQuery = req.user.user_type === 'admin'
    ? 'SELECT * FROM businesses WHERE id = ?'
    : 'SELECT * FROM businesses WHERE id = ? AND owner_id = ?'
  const checkParams = req.user.user_type === 'admin' ? [id] : [id, req.user.id]

  db.query(checkQuery, checkParams, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'Not authorized to delete this business.' })
    }

    db.query('DELETE FROM businesses WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ message: 'Error deleting business.' })
      res.status(200).json({ message: 'Business deleted successfully!' })
    })
  })
}

// ── GET OWNER'S OWN BUSINESSES ──
const getMyBusinesses = (req, res) => {
  const query = `
    SELECT b.*,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.id) AS review_count
    FROM businesses b
    LEFT JOIN reviews r ON b.id = r.business_id
    WHERE b.owner_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    res.status(200).json(results)
  })
}

// ── REPORT BUSINESS ──
const reportBusiness = (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Please provide a reason for the report.' })
  }

  // Make sure the listing exists (and remember its name, so the report still
  // makes sense later even if the listing is deleted).
  db.query('SELECT name FROM businesses WHERE id = ?', [id], (err, found) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (found.length === 0) return res.status(404).json({ message: 'Business not found.' })

    // Stop the same person from filing the same report again and again while
    // an earlier one from them is still waiting for the admin.
    const dupQuery = `
      SELECT id FROM reports
      WHERE user_id = ? AND business_id = ? AND status = 'pending'
    `
    db.query(dupQuery, [req.user.id, id], (err, existing) => {
      if (err) return res.status(500).json({ message: 'Database error.' })
      if (existing.length > 0) {
        return res.status(409).json({ message: 'You have already reported this listing. Our team is reviewing it.' })
      }

      const query = `
        INSERT INTO reports (user_id, business_id, reason, type, target_label)
        VALUES (?, ?, ?, 'business', ?)
      `
      db.query(query, [req.user.id, id, reason.trim(), found[0].name], (err) => {
        if (err) return res.status(500).json({ message: 'Error reporting business.' })
        sendNewReportAdminAlert(reason, 'business')
        res.status(201).json({ message: 'Listing reported. Our team will review it shortly.' })
      })
    })
  })
}

// ── UPLOAD LIVE PHOTO ──
// Saves the uploaded image's public URL against the business record.
// Actual file handling (multer disk storage) is wired up in routes/businesses.js.
const uploadPhoto = (req, res) => {
  const { id } = req.params

  if (!req.file) {
    return res.status(400).json({ message: 'No photo was uploaded.' })
  }

  const checkQuery = 'SELECT id FROM businesses WHERE id = ? AND owner_id = ?'
  db.query(checkQuery, [id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' })
    if (results.length === 0) {
      return res.status(403).json({ message: 'Not authorized to update this business.' })
    }

    const photoUrl = `/uploads/${req.file.filename}`
    db.query('UPDATE businesses SET photo_url = ? WHERE id = ?', [photoUrl, id], (err) => {
      if (err) return res.status(500).json({ message: 'Error saving photo.' })
      res.status(200).json({ message: 'Photo uploaded successfully!', photo_url: photoUrl })
    })
  })
}

module.exports = {
  getAllBusinesses,
  getBusinessById,
  addBusiness,
  updateBusiness,
  deleteBusiness,
  getMyBusinesses,
  reportBusiness,
  uploadPhoto,
}
