const mysql = require('mysql2')
require('dotenv').config()

// Using a connection POOL instead of a single connection.
// A single connection can drop (e.g. MySQL "wait_timeout") and then every
// query after that silently fails until the server is restarted. A pool
// automatically opens/reuses/recovers connections as needed.
const db = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
})

// Self-healing migration: creates any table that newer app code needs but
// an older imported localbiz.sql dump might not have yet (e.g. someone
// updates the code without re-importing the .sql file). Safe to run every
// startup — CREATE TABLE IF NOT EXISTS is a no-op once the table exists.
const runMigrations = () => {
  const createEmailOtps = `
    CREATE TABLE IF NOT EXISTS email_otps (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      email       VARCHAR(100) NOT NULL,
      purpose     ENUM('registration', 'password_reset') NOT NULL,
      otp_hash    VARCHAR(255) NOT NULL,
      attempts    INT NOT NULL DEFAULT 0,
      verified    TINYINT(1) NOT NULL DEFAULT 0,
      expires_at  DATETIME NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_purpose (email, purpose)
    )
  `
  db.query(createEmailOtps, (err) => {
    if (err) console.error('❌ Migration failed (email_otps table):', err.message)
  })

  // Adds a column only if it is missing, so an older database keeps working
  // after the code is updated — no manual ALTER TABLE needed. Safe on every startup.
  const addColumnIfMissing = (table, column, ddl) => {
    db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column], (err, rows) => {
      if (err) return console.error(`❌ Migration check failed (${table}.${column}):`, err.message)
      if (rows.length === 0) {
        db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`, (alterErr) => {
          if (alterErr) console.error(`❌ Migration failed (${table}.${column}):`, alterErr.message)
          else console.log(`✅ Added ${table}.${column} column`)
        })
      }
    })
  }

  // Admin's written reasons / notes:
  //  - rejection_reason : why a listing was rejected (or suspended)  -> shown to the owner
  //  - approval_note    : note given when a listing was approved      -> shown to the owner
  addColumnIfMissing('businesses', 'rejection_reason', 'VARCHAR(500) NULL')
  addColumnIfMissing('businesses', 'approval_note',    'VARCHAR(500) NULL')

  //  - admin_response   : admin's explanation of a report decision    -> shown to the reporter
  //  - resolved_at      : when the admin handled the report
  //  - target_label / target_excerpt : snapshot of the reported business name /
  //    review text, so a report still makes sense after the review is deleted
  addColumnIfMissing('reports', 'admin_response',  'VARCHAR(500) NULL')
  addColumnIfMissing('reports', 'resolved_at',     'TIMESTAMP NULL DEFAULT NULL')
  addColumnIfMissing('reports', 'target_label',    'VARCHAR(200) NULL')
  addColumnIfMissing('reports', 'target_excerpt',  'VARCHAR(255) NULL')

  // When an admin deletes a reported review, the report used to be deleted with
  // it (ON DELETE CASCADE), so the person who reported it never saw the outcome.
  // Switch that foreign key to ON DELETE SET NULL so the report (and the admin's
  // response) is kept. Runs once; skipped if it is already SET NULL.
  const fkQuery = `
    SELECT kcu.CONSTRAINT_NAME AS name, rc.DELETE_RULE AS delete_rule
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
      ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = 'reports'
      AND kcu.COLUMN_NAME = 'review_id' AND kcu.REFERENCED_TABLE_NAME = 'reviews'
  `
  db.query(fkQuery, (err, rows) => {
    if (err || rows.length === 0) return
    if (rows[0].delete_rule === 'SET NULL') return
    db.query(`ALTER TABLE reports DROP FOREIGN KEY \`${rows[0].name}\``, (dropErr) => {
      if (dropErr) return console.error('❌ Migration failed (drop reports.review_id FK):', dropErr.message)
      db.query(
        `ALTER TABLE reports ADD CONSTRAINT fk_reports_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL`,
        (addErr) => {
          if (addErr) console.error('❌ Migration failed (add reports.review_id FK):', addErr.message)
          else console.log('✅ reports.review_id now keeps the report when a review is deleted')
        }
      )
    })
  })
}

// Quick check on startup so we get a clear log message if MySQL/XAMPP isn't running.
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message)
    return
  }
  console.log('✅ MySQL Database connected successfully!')
  connection.release()
  runMigrations()
})

module.exports = db
