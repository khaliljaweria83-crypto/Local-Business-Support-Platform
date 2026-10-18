const express = require('express')
const cors    = require('cors')
const path    = require('path')
require('dotenv').config()

// Import Routes
const authRoutes     = require('./routes/auth')
const businessRoutes = require('./routes/businesses')
const reviewRoutes   = require('./routes/reviews')
const adminRoutes    = require('./routes/admin')
const promotionRoutes = require('./routes/promotions')
const reportRoutes    = require('./routes/reports')

const app = express()

// ── MIDDLEWARE ──
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded business photos (e.g. /uploads/business-3-169999.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── ROUTES ──
app.use('/api/auth',       authRoutes)
app.use('/api/businesses', businessRoutes)
app.use('/api/reviews',    reviewRoutes)
app.use('/api/admin',      adminRoutes)
app.use('/api/promotions', promotionRoutes)
app.use('/api/reports',    reportRoutes)

// ── HOME ROUTE ──
app.get('/', (req, res) => {
  res.json({
    message: '🏪 LocalBiz API is running!',
    project: 'BSIT22-G3 - Local Business Support Platform',
    team:    'Yasir Mehmood (076984) & Hafiz Bilal Khalil (077018)',
    version: '1.0.0',
  })
})

// ── 404 HANDLER ──
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

// ── START SERVER ──
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ LocalBiz Server running on http://localhost:${PORT}`)
  console.log(`📋 Project: BSIT22-G3 - Local Business Support Platform`)
})
