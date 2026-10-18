const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Only these three image types are accepted, and the file extension is chosen
// by us from the type — the uploaded file's own name/extension is never used,
// so things like .svg / .html files can't be smuggled in as "images".
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `business-${req.params.id}-${Date.now()}${ALLOWED[file.mimetype]}`)
  },
})

function fileFilter(req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    return cb(new Error('Only JPG, PNG or WEBP images are allowed.'))
  }
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
})

module.exports = upload
