// ============================================
// Email Notification Service (Nodemailer + Gmail SMTP)
// ============================================
// Sends notification emails for:
//  - Business approved
//  - Business rejected
//  - New business submitted (notify admin)
//  - New report filed (notify admin)
//  - OTP codes (registration verification + password reset)
//
// If EMAIL_USER / EMAIL_PASS aren't configured in .env, sending is skipped
// and logged to the console instead — this lets the rest of the app (and a
// demo/viva) keep working normally without real Gmail credentials.
//
// ── A note on spam folders ──
// Whether an email lands in the inbox or spam is ultimately decided by
// Gmail's own spam-filtering algorithms, based on sender reputation — that
// is NOT something application code can fully control, especially for a
// personal/new Gmail account sending its first few automated emails. What
// this file DOES do to minimize the chance of it:
//   - sends a plain-text version alongside the HTML one (an HTML-only email
//     with no text alternative is one of the most common spam signals)
//   - uses a single consistent, fully-formed branded template (a bare
//     "here's your code" email with almost no other content looks far more
//     like a phishing template to spam filters than a normal-looking one)
//   - sets a proper reply-to and a real "from" display name
// The single most effective fix, though, is a manual one-time action: open
// the first email that lands in Spam, click "Report not spam" / "Looks
// safe", and/or add the sending address to contacts. That teaches Gmail's
// filter to trust that sender going forward — see testEmail.js for a
// quick way to trigger a real test send and try this yourself.
// ============================================

const nodemailer = require('nodemailer')
require('dotenv').config()

const isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
const BRAND = 'LocalBiz Discovery'

let transporter = null
if (isConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  // Proactively check the Gmail credentials as soon as the server starts,
  // instead of only finding out they're wrong the first time someone
  // requests an OTP. This is the #1 cause of "OTP never arrives" — a
  // regular Gmail password instead of a 16-character App Password, or an
  // App Password that was copied with a typo/extra space.
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Email is configured but the Gmail login failed — OTP/notification emails will NOT be delivered.')
      console.error('   Reason:', err.message)
      console.error('   Common causes: EMAIL_PASS is your normal Gmail password instead of a 16-character App Password, 2-Step Verification isn\'t turned on for that Gmail account, or the App Password has a typo/space in .env.')
      console.error('   Run "node testEmail.js your@email.com" from the backend folder to debug this in isolation.')
    } else {
      console.log(`📧 Email is configured and Gmail login succeeded (sending as ${process.env.EMAIL_USER}) — OTP and notification emails will be delivered for real.`)
    }
  })
}

// Strips the HTML down to a readable plain-text version. A real text
// alternative (not just a copy of the HTML) is what most webmail spam
// filters expect from a legitimate transactional email.
const htmlToText = (html) => html
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

// One consistent, fully-formed branded wrapper for every email this app
// sends — a bare one-line "here's your code" email is far more likely to
// be flagged than a normal-looking, complete one with a header/footer.
const wrapEmail = (bodyHtml) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
    <div style="background:#1e5c3a;padding:18px 24px;border-radius:10px 10px 0 0;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;">${BRAND}</span>
    </div>
    <div style="border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;padding:24px;">
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#888;margin-top:16px;text-align:center;">
      This is an automated message from ${BRAND}, a business directory platform.
      If you weren't expecting this email, you can safely ignore it.
    </p>
  </div>
`

const send = async ({ to, subject, html }) => {
  if (!isConfigured) {
    console.log(`📧 [Email skipped — no EMAIL_USER/EMAIL_PASS set] To: ${to} | Subject: ${subject}`)
    return { sent: false, reason: 'not_configured' }
  }
  const wrapped = wrapEmail(html)
  try {
    await transporter.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_USER,
      to,
      subject,
      text: htmlToText(wrapped),
      html: wrapped,
    })
    console.log(`📧 Email sent to ${to}: ${subject}`)
    return { sent: true }
  } catch (err) {
    // Never let an email failure break the actual approve/reject/report/OTP
    // action — but log the FULL nodemailer error (not just err.message) since
    // Gmail auth failures (bad App Password, 2-Step Verification not on,
    // etc.) usually have the real reason in err.response / err.code that
    // .message alone doesn't always show.
    console.error('❌ Email send error:', err.code || '', err.message)
    if (err.response) console.error('   SMTP response:', err.response)
    return { sent: false, reason: 'send_failed', error: err.message }
  }
}

// Escape text before putting it inside an HTML email (reasons/notes are free text).
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const sendBusinessApprovedEmail = (ownerEmail, businessName, note) => send({
  to: ownerEmail,
  subject: `Your business "${businessName}" has been approved!`,
  html: `
    <p>Good news!</p>
    <p>Your business listing <strong>${esc(businessName)}</strong> has been reviewed and <strong>approved</strong> by our admin team. It is now live on ${BRAND}.</p>
    ${note ? `<p>Note from the admin: ${esc(note)}</p>` : ''}
    <p>— ${BRAND}</p>
  `,
})

const sendBusinessRejectedEmail = (ownerEmail, businessName, reason) => send({
  to: ownerEmail,
  subject: `Your business "${businessName}" was not approved`,
  html: `
    <p>Hello,</p>
    <p>Your business listing <strong>${esc(businessName)}</strong> was reviewed and was <strong>not approved</strong> at this time.</p>
    ${reason ? `<p>Reason: ${esc(reason)}</p>` : ''}
    <p>You can edit the listing from your dashboard and resubmit it for review.</p>
    <p>— ${BRAND}</p>
  `,
})

const sendNewBusinessAdminAlert = (businessName, ownerName) => send({
  to: process.env.ADMIN_NOTIFY_EMAIL,
  subject: `New business pending approval: ${businessName}`,
  html: `
    <p>A new business listing has been submitted and is waiting for review.</p>
    <p><strong>Business:</strong> ${businessName}<br/><strong>Owner:</strong> ${ownerName}</p>
    <p>Please log in to the admin panel to review it.</p>
    <p>— ${BRAND}</p>
  `,
})

const sendNewReportAdminAlert = (reason, type) => send({
  to: process.env.ADMIN_NOTIFY_EMAIL,
  subject: `New ${type} report submitted`,
  html: `
    <p>A new ${type} report has been filed on ${BRAND}.</p>
    <p><strong>Reason:</strong> ${esc(reason)}</p>
    <p>Please log in to the admin panel to review it.</p>
    <p>— ${BRAND}</p>
  `,
})

// Tells the person who filed a report what the admin decided, and why.
const sendReportOutcomeEmail = (toEmail, type, targetName, outcome, response) => send({
  to: toEmail,
  subject: `Update on your ${type} report`,
  html: `
    <p>Hello,</p>
    <p>Thank you for your report about <strong>${esc(targetName || 'a listing')}</strong>. Our admin team has reviewed it.</p>
    <p><strong>Decision:</strong> ${outcome === 'dismissed' ? 'Dismissed — no action was needed' : 'Resolved — action was taken'}</p>
    <p><strong>Admin's explanation:</strong> ${esc(response)}</p>
    <p>— ${BRAND}</p>
  `,
})

const sendPasswordResetEmail = (toEmail, fullName, token) => {
  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  return send({
    to: toEmail,
    subject: 'Reset your LocalBiz password',
    html: `
      <p>Hi ${fullName || ''},</p>
      <p>We received a request to reset your ${BRAND} password. Click the link below to choose a new one — this link is valid for 1 hour:</p>
      <p><a href="${resetLink}" style="color:#1e5c3a;">${resetLink}</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
      <p>— ${BRAND}</p>
    `,
  })
}

// Single OTP-email sender, reused for both password-reset OTPs and
// registration email-verification OTPs — the wording is the only thing
// that changes between the two purposes.
const sendOtpEmail = (toEmail, otp, purpose) => {
  const subject = purpose === 'registration'
    ? `${otp} is your ${BRAND} verification code`
    : `${otp} is your ${BRAND} password reset code`
  const intro = purpose === 'registration'
    ? "Thanks for signing up. Use the verification code below to confirm your email address and finish creating your account. It's valid for 10 minutes."
    : 'Use the code below to continue resetting your password. This code is valid for 10 minutes.'
  return send({
    to: toEmail,
    subject,
    html: `
      <p>Hello,</p>
      <p>${intro}</p>
      <p style="text-align:center;background:#f2f7f4;border-radius:8px;padding:16px;margin:20px 0;">
        <span style="font-size:30px;font-weight:700;letter-spacing:8px;color:#1e5c3a;">${otp}</span>
      </p>
      <p>Please don't share this code with anyone — ${BRAND} staff will never ask you for it.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>— ${BRAND}</p>
    `,
  })
}

module.exports = {
  sendBusinessApprovedEmail,
  sendBusinessRejectedEmail,
  sendNewBusinessAdminAlert,
  sendNewReportAdminAlert,
  sendReportOutcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  isEmailConfigured: isConfigured,
}
