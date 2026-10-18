import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Store, User, CheckCircle2, Eye, EyeOff, ShieldCheck, Info, KeyRound, BadgeCheck } from 'lucide-react'
import { authApi } from '../api.js'
import { CATEGORIES } from '../categories.js'
import { CITIES } from '../cities.js'
import CustomSelect from '../components/CustomSelect.jsx'
import { useGo } from '../useGo.js'
import { formatPkPhone } from '../phone.js'
import { isStrongPassword, PASSWORD_HINT } from '../passwordRules.js'
import PasswordChecklist from '../components/PasswordChecklist.jsx'
import './AuthPage.css'

const UT = [
  { id: 'customer', icon: User,  label: 'Customer' },
  { id: 'owner',    icon: Store, label: 'Owner' },
]

// The password rule lives in ../passwordRules.js (same rule as the backend).
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function RegisterPage() {
  const go = useGo()
  const location = useLocation()
  const cameForVerification = location.state?.intent === 'verification'
  const [type, setType]   = useState('owner')
  const [form, setForm]   = useState({ name: '', email: '', pass: '', pass2: '', bname: '', cat: '', city: '', phone: '', addr: '' })
  const [agreed, setAgreed] = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr]     = useState('')
  const [ok, setOk]       = useState(false)
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Email OTP verification (sir's fix: no more registering with a fake/
  // unreachable email — whoever registers must prove they control the inbox) ──
  // 'idle' → email not verified yet | 'sent' → OTP sent, awaiting code | 'verified' → done
  const [emailStep, setEmailStep] = useState('idle')
  const [emailOtp, setEmailOtp]   = useState('')
  const [devOtp, setDevOtp]       = useState('')
  const [devNote, setDevNote]     = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpErr, setOtpErr]       = useState('')
  const [otpInfo, setOtpInfo]     = useState('')

  const onEmailChange = (v) => {
    upd('email', v)
    // Any edit to an already-verified (or in-progress) email invalidates
    // that verification — they'd otherwise be able to verify one address
    // and then quietly swap in a different, unverified one before submitting.
    if (emailStep !== 'idle') { setEmailStep('idle'); setEmailOtp(''); setDevOtp(''); setDevNote(''); setOtpInfo(''); setOtpErr('') }
  }

  const sendEmailOtp = async () => {
    if (!form.email.trim() || !isValidEmail(form.email.trim())) { setOtpErr('Please enter a valid email address first.'); return }
    setOtpErr('')
    setOtpLoading(true)
    try {
      const data = await authApi.sendRegistrationOtp(form.email.trim())
      setOtpInfo(data.message)
      setDevOtp(data.devOtp || '')
      setDevNote(data.devNote || '')
      setEmailOtp('')
      setEmailStep('sent')
    } catch (e) {
      setOtpErr(e.message || 'Could not send the verification code.')
    } finally {
      setOtpLoading(false)
    }
  }

  const verifyEmailOtp = async () => {
    if (emailOtp.trim().length !== 6) { setOtpErr('Please enter the 6-digit code.'); return }
    setOtpErr('')
    setOtpLoading(true)
    try {
      await authApi.verifyOtp(form.email.trim(), emailOtp.trim(), 'registration')
      setEmailStep('verified')
    } catch (e) {
      setOtpErr(e.message || 'Could not verify that code.')
    } finally {
      setOtpLoading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.pass) { setErr('Please fill all required fields.'); return }
    if (emailStep !== 'verified') { setErr('Please verify your email address first — click "Send Code" next to the email field.'); return }
    if (!isStrongPassword(form.pass)) { setErr(PASSWORD_HINT + '.'); return }
    if (form.pass !== form.pass2) { setErr('Passwords do not match.'); return }
    if (type === 'owner' && form.bname && (!form.cat || !form.city || !form.addr)) {
      setErr('Please select a category, city and address for your business, or leave the business name blank and add it later from your dashboard.')
      return
    }
    if (!agreed) { setErr('Please agree to Terms of Service.'); return }
    setErr('')
    setLoading(true)
    try {
      await authApi.register({
        full_name: form.name,
        email: form.email,
        password: form.pass,
        user_type: type,
        business_name: type === 'owner' ? form.bname : undefined,
        category: type === 'owner' ? form.cat : undefined,
        city: type === 'owner' ? form.city : undefined,
        phone: type === 'owner' ? form.phone : undefined,
        address: type === 'owner' ? form.addr : undefined,
      })
      setOk(true)
      setTimeout(() => go('login'), 2000)
    } catch (e2) {
      setErr(e2.message || 'Registration failed.')
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
          <h2>Join Pakistan's Growing Business Community.</h2>
          <p>Get discovered by thousands of local customers across Pakistan searching for your services.</p>
          <div className="al-card">
            <p className="al-quote">"Registering on LocalBiz doubled my walk-in customers within the first month!"</p>
            <div className="al-author">
              <div className="al-av">SK</div>
              <div><strong>Sajid Khan</strong><span>Restaurant Owner, GT Road</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-box fade-up" style={{ maxWidth: 500 }}>
          <h1>Create Account</h1>
          <p className="auth-sub">Fill in the details below to get started. Customers can create a free account too — you'll need one to write reviews.</p>
          {cameForVerification && (
            <div className="toast" style={{ marginBottom: 14 }}>
              <ShieldCheck size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
              To get your business verified, first create a Business Owner account below — once your listing is added, an admin will review and verify it.
            </div>
          )}
          <div className="user-types">
            {UT.map(u => (
              <div key={u.id} className={`ut-card ${type === u.id ? 'active' : ''}`} onClick={() => setType(u.id)}>
                <span className="ut-icon"><u.icon size={20} /></span>
                <span className="ut-label">{u.label}</span>
              </div>
            ))}
          </div>
          {err && <div className="toast toast-error">{err}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="e.g. Ahmad Khan" value={form.name} onChange={e => upd('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input" type="email" placeholder="name@example.com"
                  value={form.email} onChange={e => onEmailChange(e.target.value)}
                  disabled={emailStep === 'verified'}
                  style={{ flex: 1 }}
                />
                {emailStep === 'verified' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green-main)', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', padding: '0 4px' }}>
                    <BadgeCheck size={16} /> Verified
                  </span>
                ) : (
                  <button
                    type="button" className="btn-outline" style={{ padding: '0 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={sendEmailOtp} disabled={otpLoading || !form.email.trim()}
                  >
                    {otpLoading && emailStep === 'idle' ? <span className="spinner" style={{ borderTopColor: 'var(--green-main)', borderColor: 'rgba(30,92,58,0.25)' }} /> : emailStep === 'sent' ? 'Resend Code' : 'Send Code'}
                  </button>
                )}
              </div>

              {emailStep === 'sent' && (
                <div style={{ marginTop: 10, padding: 12, background: 'var(--green-pale)', borderRadius: 10 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', margin: '0 0 8px' }}>{otpInfo || `We've sent a 6-digit code to ${form.email}.`}</p>
                  {devOtp && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--green-dark)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Info size={13} /> {devNote || "Email isn't configured on this server yet"} — for testing, your code is<strong>&nbsp;{devOtp}</strong>
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="inp-wrap" style={{ flex: 1 }}>
                      <span className="inp-icon"><KeyRound size={15} /></span>
                      <input
                        className="form-input" inputMode="numeric" maxLength={6}
                        placeholder="123456" value={emailOtp}
                        onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={{ background: 'white', letterSpacing: 4, fontWeight: 700 }}
                      />
                    </div>
                    <button type="button" className="btn-primary" style={{ padding: '0 18px', fontSize: '0.82rem' }} onClick={verifyEmailOtp} disabled={otpLoading}>
                      {otpLoading ? <span className="spinner" /> : 'Verify'}
                    </button>
                  </div>
                </div>
              )}
              {otpErr && <span style={{ fontSize: '0.76rem', color: 'var(--red)', display: 'block', marginTop: 6 }}>{otpErr}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="inp-wrap">
                  <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.pass} onChange={e => upd('pass', e.target.value)} />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordChecklist password={form.pass} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <div className="inp-wrap">
                  <input className="form-input" type={showPass2 ? 'text' : 'password'} placeholder="••••••••" value={form.pass2} onChange={e => upd('pass2', e.target.value)} />
                  <button type="button" className="eye-btn" onClick={() => setShowPass2(!showPass2)}>
                    {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            {type === 'owner' && <>
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input className="form-input" placeholder="e.g. Gujranwala Sweets" value={form.bname} onChange={e => upd('bname', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <CustomSelect className="form-select" value={form.cat} onChange={v => upd('cat', v)} options={CATEGORIES} placeholder="Select Industry" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <CustomSelect className="form-select" value={form.city} onChange={v => upd('city', v)} options={CITIES} placeholder="Select City" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone (PK)</label>
                <input className="form-input" placeholder="0300 1234567" value={form.phone} onChange={e => upd('phone', formatPkPhone(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Business Address</label>
                <textarea className="form-textarea" style={{ minHeight: 70 }} placeholder="e.g. GT Road, Gujranwala City" value={form.addr} onChange={e => upd('addr', e.target.value)} />
              </div>
              <p style={{fontSize:'0.78rem',color:'var(--gray-400)',marginTop:-8,marginBottom:14}}>
                Your business listing will be reviewed by an admin before it appears in the public directory.
              </p>
            </>}
            <div className="terms-row">
              <input type="checkbox" id="tc" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              <label htmlFor="tc">I agree to LocalBiz's <button type="button" onClick={() => go('terms')} className="inline-link">Terms of Service</button> and <button type="button" onClick={() => go('privacy')} className="inline-link">Privacy Policy</button>.</label>
            </div>
            <button className="btn-primary auth-btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
            {ok && (
              <div className="toast" style={{ marginTop: 10 }}>
                <CheckCircle2 size={15} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Account created! Redirecting to login...
              </div>
            )}
          </form>
          <div className="auth-divider"><span>already have an account?</span></div>
          <p className="auth-switch"><button onClick={() => go('login')}>Login here</button></p>
        </div>
        <div className="auth-footer"><span>LOCALBIZ</span><span>FYDP 2026 · GIOC Gujranwala</span></div>
      </div>
    </div>
  )
}
