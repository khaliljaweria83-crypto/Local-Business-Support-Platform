// ============================================
// Standalone Gmail credential tester
// ============================================
// Run this from the backend folder to check — completely independent of
// the rest of the app — whether the EMAIL_USER / EMAIL_PASS in your .env
// can actually log in to Gmail and send a real email. This is the fastest
// way to debug "OTP email never arrives" without digging through the whole
// LocalBiz app first.
//
// Usage:
//   node testEmail.js your-personal-email@example.com
//
// (sends a real test email to the address you pass in)
// ============================================

require('dotenv').config()
const nodemailer = require('nodemailer')

const toAddress = process.argv[2]

console.log('── LocalBiz Gmail credential test ──')
console.log('EMAIL_USER in .env:', process.env.EMAIL_USER || '(not set)')
console.log('EMAIL_PASS in .env:', process.env.EMAIL_PASS ? `set (${process.env.EMAIL_PASS.length} characters)` : '(not set)')
console.log('')

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('❌ EMAIL_USER and/or EMAIL_PASS are blank in your .env file.')
  console.log('   Open backend/.env and fill both in — see the setup steps below.')
  printSetupSteps()
  process.exit(1)
}

if (process.env.EMAIL_PASS.replace(/\s/g, '').length !== 16) {
  console.log('⚠️  EMAIL_PASS is not 16 characters long — a Gmail App Password is ALWAYS exactly')
  console.log('   16 characters (Google shows it as 4 groups of 4, e.g. "abcd efgh ijkl mnop").')
  console.log('   If you pasted your normal Gmail login password here, that will NOT work —')
  console.log('   Gmail blocks it. You need an App Password specifically (see steps below).')
  console.log('')
}

if (!toAddress) {
  console.log('ℹ️  No test address given, so this will only verify the login (not send an email).')
  console.log('   Run again as: node testEmail.js your-personal-email@example.com  to also send a real test email.')
  console.log('')
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

transporter.verify((err) => {
  if (err) {
    console.log('❌ Gmail LOGIN failed:', err.message)
    console.log('')
    printSetupSteps()
    process.exit(1)
  }

  console.log('✅ Gmail login succeeded! Your EMAIL_USER/EMAIL_PASS are correct.')

  if (!toAddress) {
    console.log('   (Re-run with an email address as the argument to also send a real test email.)')
    process.exit(0)
  }

  console.log(`   Sending a test email to ${toAddress} ...`)
  transporter.sendMail({
    from: `"LocalBiz Discovery" <${process.env.EMAIL_USER}>`,
    to: toAddress,
    subject: 'LocalBiz test email — it works! ✅',
    html: '<p>If you\'re reading this, your Gmail App Password is configured correctly and LocalBiz can send real OTP emails.</p>',
  }, (sendErr, info) => {
    if (sendErr) {
      console.log('❌ Login worked, but SENDING failed:', sendErr.message)
      process.exit(1)
    }
    console.log('✅ Test email sent! Message ID:', info.messageId)
    console.log('   Check the inbox (and spam folder) of', toAddress)
    process.exit(0)
  })
})

function printSetupSteps() {
  console.log('── How to set up a Gmail App Password ──')
  console.log('1. Use a Gmail account (create a free throwaway one for this project if you don\'t want to use your personal Gmail).')
  console.log('2. Turn on 2-Step Verification for that account: https://myaccount.google.com/signinoptions/two-step-verification')
  console.log('   (App Passwords only appear once 2-Step Verification is ON.)')
  console.log('3. Go to https://myaccount.google.com/apppasswords')
  console.log('4. Create a new App Password (any name, e.g. "LocalBiz") — Google gives you a 16-character code like "abcd efgh ijkl mnop".')
  console.log('5. In backend/.env, set:')
  console.log('     EMAIL_USER=your-gmail-address@gmail.com')
  console.log('     EMAIL_PASS=abcdefghijklmnop        <- the 16 characters, spaces don\'t matter')
  console.log('6. Restart the backend server, then re-run: node testEmail.js your-personal-email@example.com')
}
