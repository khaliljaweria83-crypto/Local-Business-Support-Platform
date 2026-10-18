import { useState, useEffect } from 'react'
import { User, CheckCircle2, Flag } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import { authApi, reportApi } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatPkPhone } from '../phone.js'
import './DashPage.css'

// A dedicated "My Profile" page for logged-in customers — owners and
// admins already have an equivalent Settings tab inside their own
// dashboards, but customers have no dashboard at all, so without this
// page there was nowhere for a customer to view/update their name or
// phone number after registering.
export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk]   = useState(false)
  const [err, setErr] = useState('')
  const [myReports, setMyReports] = useState([])

  useEffect(() => {
    authApi.profile()
      .then(p => {
        setName(p.full_name || '')
        setEmail(p.email || '')
        setPhone(p.phone || '')
      })
      .catch(e => setErr(e.message || 'Could not load your profile.'))
      .finally(() => setLoaded(true))

    // Reports this person filed, with the admin's decision + explanation
    reportApi.mine().then(setMyReports).catch(() => setMyReports([]))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Full name is required.'); return }
    setErr('')
    setSaving(true)
    try {
      await authApi.updateProfile({ full_name: name, phone })
      updateUser({ full_name: name })
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (e2) {
      setErr(e2.message || 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      <Navbar />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '50px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green-main)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
            <User size={20} />
          </span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-dark)', fontSize: '1.4rem', margin: 0 }}>My Profile</h1>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', margin: 0 }}>Manage your account details</p>
          </div>
        </div>

        <div className="d-card">
          {!loaded ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '0.86rem' }}>Loading…</p>
          ) : (
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={email} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="0300 1234567" value={phone} onChange={e => setPhone(formatPkPhone(e.target.value))} />
              </div>
              {err && <div className="toast toast-error">{err}</div>}
              {ok && <div className="toast"><CheckCircle2 size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />Profile updated!</div>}
              <button className="btn-primary" type="submit" disabled={saving} style={{ justifyContent: 'center', marginTop: 4 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>

        {/* MY REPORTS — what the admin decided about reports this person filed, and why */}
        {myReports.length > 0 && (
          <div className="d-card" style={{ marginTop: 22 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-dark)', fontSize: '1.1rem', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flag size={16} /> My Reports
            </h2>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.8rem', margin: '0 0 14px' }}>
              Reports you filed, and what our team decided.
            </p>

            {myReports.map(r => (
              <div key={r.id} style={{ borderTop: '1px solid var(--gray-200)', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <strong style={{ fontSize: '0.9rem' }}>
                    {r.target_name || 'Deleted listing'}
                    <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: '0.76rem' }}> · {r.type} report</span>
                  </strong>
                  <span className={`badge ${r.status === 'pending' ? 'badge-pending' : r.status === 'dismissed' ? 'badge-suspended' : 'badge-active'}`}>
                    {r.status === 'pending' ? 'Under review' : r.status === 'reviewed' ? 'Resolved' : 'Dismissed'}
                  </span>
                </div>
                {r.type === 'review' && r.review_comment && (
                  <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)', margin: '4px 0 0' }}>
                    Review: "{r.review_comment.slice(0, 90)}{r.review_comment.length > 90 ? '…' : ''}"
                  </p>
                )}
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', margin: '6px 0 0' }}>
                  <strong>You said:</strong> {r.reason}
                </p>
                {r.status !== 'pending' && r.admin_response && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--green-dark)', background: 'var(--green-pale)', borderRadius: 8, padding: '8px 10px', margin: '8px 0 0' }}>
                    <strong>Admin's explanation:</strong> {r.admin_response}
                  </p>
                )}
                <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', margin: '6px 0 0' }}>
                  Filed {new Date(r.created_at).toLocaleDateString()}
                  {r.resolved_at ? ` · Decided ${new Date(r.resolved_at).toLocaleDateString()}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
