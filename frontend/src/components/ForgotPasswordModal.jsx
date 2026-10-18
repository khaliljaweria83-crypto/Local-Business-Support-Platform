import { useState } from 'react'
import { X, Mail, KeyRound, Info } from 'lucide-react'
import { authApi } from '../api.js'
import { useGo } from '../useGo.js'
import './ForgotPasswordModal.css'

// Sir's fix: "Forgot Password" used to go straight from email → a direct
// reset link (since real email sending isn't configured yet). Now it's a
// proper two-step OTP flow — email → 6-digit code → only then does the
// existing ResetPasswordPage (token-based) open, matching how a real
// production password reset should behave.
export default function ForgotPasswordModal({ onClose, initialEmail = '' }) {
  const go = useGo()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [devNote, setDevNote] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const sendOtp = async (e) => {
    e?.preventDefault()
    if (!email.trim()) { setErr('Please enter your account email.'); return }
    setErr('')
    setLoading(true)
    try {
      const data = await authApi.forgotPassword(email.trim())
      setInfo(data.message)
      // devOtp is only present when the real email genuinely wasn't
      // delivered (not configured, or configured but the send failed) —
      // devNote from the backend explains which of those it was.
      setDevOtp(data.devOtp || '')
      setDevNote(data.devNote || '')
      setOtp('')
      setStep('otp')
    } catch (e2) {
      setErr(e2.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (e) => {
    e?.preventDefault()
    if (!otp.trim() || otp.trim().length !== 6) { setErr('Please enter the 6-digit code.'); return }
    setErr('')
    setLoading(true)
    try {
      const data = await authApi.verifyOtp(email.trim(), otp.trim(), 'password_reset')
      onClose()
      go('reset-password', { token: data.resetToken })
    } catch (e2) {
      setErr(e2.message || 'Could not verify that code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fp-overlay" onClick={onClose}>
      <div className="fp-box" onClick={e => e.stopPropagation()}>
        <button type="button" className="fp-close" onClick={onClose}><X size={18} /></button>

        {step === 'email' ? (
          <>
            <h3>Reset your password</h3>
            <p className="fp-sub">Enter your account email — we'll send a 6-digit code to it.</p>
            {err && <div className="toast toast-error">{err}</div>}
            <form onSubmit={sendOtp}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="inp-wrap">
                  <span className="inp-icon"><Mail size={15} /></span>
                  <input
                    className="form-input" type="email" autoFocus
                    placeholder="name@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button className="btn-primary auth-btn" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Send Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h3>Enter verification code</h3>
            <p className="fp-sub">{info || `We've sent a 6-digit code to ${email}.`}</p>
            {devOtp && (
              <div className="toast" style={{ marginBottom: 12 }}>
                <Info size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                {devNote || "Email sending isn't configured on this server yet"} — for testing, your code is <strong>{devOtp}</strong>.
              </div>
            )}
            {err && <div className="toast toast-error">{err}</div>}
            <form onSubmit={verify}>
              <div className="form-group">
                <label className="form-label">6-Digit Code</label>
                <div className="inp-wrap">
                  <span className="inp-icon"><KeyRound size={15} /></span>
                  <input
                    className="form-input otp-input" inputMode="numeric" maxLength={6} autoFocus
                    placeholder="123456"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
              </div>
              <button className="btn-primary auth-btn" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Verify & Continue'}
              </button>
            </form>
            <p className="auth-switch" style={{ marginTop: 14 }}>
              Didn't get it?{' '}
              <button type="button" onClick={sendOtp} disabled={loading}>Resend code</button>
              {' · '}
              <button type="button" onClick={() => { setStep('email'); setErr('') }}>Change email</button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
