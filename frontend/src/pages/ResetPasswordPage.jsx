import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Store, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { authApi } from '../api.js'
import { useGo } from '../useGo.js'
import { isStrongPassword, PASSWORD_HINT } from '../passwordRules.js'
import PasswordChecklist from '../components/PasswordChecklist.jsx'
import './AuthPage.css'

// The password rule lives in ../passwordRules.js (same rule as the backend).

export default function ResetPasswordPage() {
  const go = useGo()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [pass, setPass]   = useState('')
  const [pass2, setPass2] = useState('')
  const [show, setShow]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr]     = useState('')
  const [ok, setOk]       = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!token) { setErr('This reset link is missing its token. Please use the link from your email.'); return }
    if (!isStrongPassword(pass)) { setErr(PASSWORD_HINT + '.'); return }
    if (pass !== pass2) { setErr('Passwords do not match.'); return }
    setErr('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, pass)
      setOk(true)
      setTimeout(() => go('login'), 2500)
    } catch (e2) {
      setErr(e2.message || 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="al-inner">
          <div className="al-logo" onClick={() => go('landing')}>
            <span className="nav-icon" style={{ width: 32, height: 32 }}><Store size={16} /></span>
            <span>LocalBiz</span>
          </div>
          <h2>Choose a new password.</h2>
          <p>Pick something secure that you haven't used before.</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-box fade-up">
          <h1>Reset Password</h1>
          <p className="auth-sub">Enter your new password below</p>

          {!token && (
            <div className="toast toast-error" style={{ marginBottom: 14 }}>
              No reset token found in this link. Please use the link from your email, or request a new one from the login page.
            </div>
          )}

          {ok ? (
            <div className="toast" style={{ marginTop: 6 }}>
              <CheckCircle2 size={15} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Password reset successfully! Redirecting to login...
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="inp-wrap">
                  <span className="inp-icon"><Lock size={15} /></span>
                  <input className="form-input" type={show ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
                  <button type="button" className="eye-btn" onClick={() => setShow(!show)}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordChecklist password={pass} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="inp-wrap">
                  <span className="inp-icon"><Lock size={15} /></span>
                  <input className="form-input" type={show ? 'text' : 'password'} placeholder="••••••••" value={pass2} onChange={e => setPass2(e.target.value)} />
                </div>
              </div>
              {err && <div className="toast toast-error">{err}</div>}
              <button className="btn-primary auth-btn" type="submit" disabled={loading || !token}>
                {loading ? <span className="spinner" /> : 'Reset Password'}
              </button>
            </form>
          )}
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-switch"><button onClick={() => go('login')}>Back to Login</button></p>
        </div>
        <div className="auth-footer">
          <span>LOCALBIZ</span>
          <span>© 2026 LocalBiz Discovery. All rights reserved.</span>
        </div>
      </div>
    </div>
  )
}
