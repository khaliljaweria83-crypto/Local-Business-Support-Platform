import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Store, User, ShieldCheck, Mail, Lock, Eye, EyeOff, Info } from 'lucide-react'
import { authApi } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useGo } from '../useGo.js'
import ForgotPasswordModal from '../components/ForgotPasswordModal.jsx'
import './AuthPage.css'

const ROLES = [
  { id: 'customer', icon: User,        label: 'Customer' },
  { id: 'owner',    icon: Store,       label: 'Business Owner' },
  { id: 'admin',    icon: ShieldCheck, label: 'Admin' },
]

const REASON_MESSAGES = {
  owner: 'Please login with a Business Owner account to access that dashboard.',
  admin: 'Please login with an Admin account to access that panel.',
}

export default function LoginPage() {
  const go = useGo()
  const location = useLocation()
  const reasonMsg = REASON_MESSAGES[location.state?.reason]
  const { login } = useAuth()
  const [role, setRole]   = useState('customer')
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [show, setShow]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr]     = useState('')
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setErr('Please fill in all fields.'); return }
    setErr('')
    setLoading(true)
    try {
      const data = await authApi.login({ email, password: pass, user_type: role })
      login(data.token, data.user)
      if (data.user.user_type === 'admin') go('admin')
      else if (data.user.user_type === 'owner') go('owner')
      else go('landing')
    } catch (e2) {
      setErr(e2.message || 'Login failed.')
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
          <h2>Connect with Pakistan's finest local businesses.</h2>
          <p>Thousands of verified local businesses across Pakistan waiting to serve you.</p>
          <div className="al-card">
            <p className="al-quote">"LocalBiz helped me find the best karahi in town within 2 minutes!"</p>
            <div className="al-author">
              <div className="al-av">AR</div>
              <div><strong>Ahmed Raza</strong><span>Regular Customer</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-box fade-up">
          <h1>Welcome Back</h1>
          <p className="auth-sub">Login to your LocalBiz account</p>
          {reasonMsg && (
            <div className="toast" style={{ marginBottom: 14 }}>
              <Info size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
              {reasonMsg}
            </div>
          )}
          <div className="role-tabs">
            {ROLES.map(r => (
              <button key={r.id} className={`role-tab ${role === r.id ? 'active' : ''}`} onClick={() => setRole(r.id)}>
                <r.icon size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                {r.label}
              </button>
            ))}
          </div>
          {err && <div className="toast toast-error">{err}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="inp-wrap">
                <span className="inp-icon"><Mail size={15} /></span>
                <input className="form-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <div className="lbl-row">
                <label className="form-label">Password</label>
                <button type="button" className="forgot-btn" onClick={() => setShowForgot(true)}>Forgot Password?</button>
              </div>
              <div className="inp-wrap">
                <span className="inp-icon"><Lock size={15} /></span>
                <input className="form-input" type={show ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
                <button type="button" className="eye-btn" onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn-primary auth-btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Login'}
            </button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-switch">Don't have an account?{' '}
            <button onClick={() => go('register')}>Register here</button>
          </p>
        </div>
        <div className="auth-footer">
          <span>LOCALBIZ</span>
          <span>© 2026 LocalBiz Discovery. All rights reserved.</span>
        </div>
      </div>
      {showForgot && <ForgotPasswordModal initialEmail={email} onClose={() => setShowForgot(false)} />}
    </div>
  )
}
