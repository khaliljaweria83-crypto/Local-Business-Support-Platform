import { useState, useEffect, useCallback } from 'react'
import {
  Store, Users, Clock, Star, Flag, Settings as SettingsIcon, Home, LogOut,
  CheckCircle2, XCircle, PartyPopper, Download, ArrowRight, Phone, ImageOff, ClipboardList,
} from 'lucide-react'
import { adminApi, reviewApi, SERVER_ORIGIN } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { getCategoryIcon } from '../categoryIcons.jsx'
import { useGo } from '../useGo.js'
import './DashPage.css'

const TABS = ['Overview', 'Pending Approvals', 'All Businesses', 'Users', 'Reports', 'Activity Log', 'Settings']

export default function AdminDash() {
  const go = useGo()
  const { user } = useAuth()
  const { confirm, prompt } = useUI()
  const [tab, setTab] = useState('Overview')

  const [stats, setStats]     = useState(null)
  const [pending, setPending] = useState([])
  const [bizz, setBizz]       = useState([])
  const [users, setUsers]     = useState([])
  const [reports, setReports] = useState([])
  const [logs, setLogs]       = useState([])
  const [reportFilter, setReportFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState('')
  const [toastErr, setToastErr] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState(null)

  const showToast = (msg, isErr = false) => { setToast(msg); setToastErr(isErr); setTimeout(() => setToast(''), 2500) }

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminApi.stats(),
      adminApi.pendingBusinesses(),
      adminApi.allBusinesses(),
      adminApi.allUsers(),
      adminApi.allReports(),
      adminApi.logs().catch(() => []),   // activity log must never break the dashboard
    ]).then(([s, p, b, u, r, l]) => {
      setStats(s); setPending(p); setBizz(b); setUsers(u); setReports(r); setLogs(l)
    }).catch(e => showToast(e.message, true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Reports tab: filter by status (clicking a status badge or a filter button)
  const filteredReports = reportFilter === 'all'
    ? reports
    : reports.filter(r => r.status === reportFilter)

  // Every decision below asks the admin for a written explanation first.
  // Cancel (null) stops the action; the text is saved and shown to the owner /
  // to the person who filed the report.
  const bizName = (id) => (pending.find(x => x.id === id) || bizz.find(x => x.id === id) || {}).name || 'this listing'

  const approve = async (id) => {
    const note = await prompt(
      `Approve "${bizName(id)}"?\n\nNote for the owner (they will see this):`,
      'Your listing has been verified and is now live.',
      { minLength: 5, placeholder: 'e.g. Photo and address verified.', submitLabel: 'Approve' }
    )
    if (note === null) return
    try { await adminApi.approveBusiness(id, note); showToast('Business approved and is now live!'); loadAll() }
    catch (e) { showToast(e.message, true) }
  }
  const reject = async (id) => {
    const reason = await prompt(
      `Reject "${bizName(id)}"?\n\nReason (the owner will see this and can fix it):`,
      '',
      { minLength: 5, placeholder: 'e.g. Photo does not match the business category.', submitLabel: 'Reject' }
    )
    if (reason === null) return
    try { await adminApi.rejectBusiness(id, reason); showToast('Business listing rejected.'); loadAll() }
    catch (e) { showToast(e.message, true) }
  }
  const toggleBiz = async (b) => {
    try {
      if (b.status === 'active') {
        const reason = await prompt(
          `Suspend "${b.name}"? It will be hidden from the public directory.\n\nReason (the owner will see this):`,
          '',
          { minLength: 5, placeholder: 'e.g. Repeated complaints about wrong contact details.', submitLabel: 'Suspend' }
        )
        if (reason === null) return
        await adminApi.suspendBusiness(b.id, reason)
        showToast(`"${b.name}" has been suspended.`)
      } else {
        const note = await prompt(
          `Activate "${b.name}" again?\n\nNote for the owner (they will see this):`,
          'Your listing has been reviewed and is active again.',
          { minLength: 5, submitLabel: 'Activate' }
        )
        if (note === null) return
        await adminApi.approveBusiness(b.id, note)
        showToast(`"${b.name}" is now active again.`)
      }
      loadAll()
    } catch (e) { showToast(e.message, true) }
  }
  const toggleUser = async (u) => {
    if (u.status === 'active' && !await confirm(`Block ${u.full_name}? They won't be able to log in${u.user_type==='owner' ? ', and their active listings will be suspended.' : '.'}`)) return
    try {
      if (u.status === 'active') { await adminApi.blockUser(u.id); showToast(`${u.full_name} has been blocked.`) }
      else { await adminApi.unblockUser(u.id); showToast(`${u.full_name} has been unblocked.`) }
      loadAll()
    } catch (e) { showToast(e.message, true) }
  }
  const dismiss = async (id) => {
    const response = await prompt(
      'Dismiss this report?\n\nExplain why no action is needed (the person who reported will see this):',
      '',
      { minLength: 5, placeholder: 'e.g. We checked the listing and the information is correct.', submitLabel: 'Dismiss' }
    )
    if (response === null) return
    try { await adminApi.dismissReport(id, response); showToast('Report dismissed.'); loadAll() }
    catch (e) { showToast(e.message, true) }
  }
  // Take real action on a report instead of just dismissing it:
  // business reports -> suspend the listing; review reports -> delete the review.
  const actOnReport = async (r) => {
    try {
      let response
      if (r.type === 'business' && r.business_id) {
        response = await prompt(
          `Suspend "${r.business_name}"? It will be hidden from the public directory.\n\nExplain what was found (the owner and the person who reported will see this):`,
          '',
          { minLength: 5, placeholder: 'e.g. Phone number was invalid; suspended until it is corrected.', submitLabel: 'Suspend' }
        )
        if (response === null) return
        await adminApi.suspendBusiness(r.business_id, response)
      } else if (r.type === 'review' && r.review_id) {
        response = await prompt(
          'Delete this review? This cannot be undone.\n\nExplain why (the person who reported will see this):',
          '',
          { minLength: 5, placeholder: 'e.g. The review contained abusive language.', submitLabel: 'Delete review' }
        )
        if (response === null) return
        await reviewApi.remove(r.review_id)
      } else {
        // The reported content is already gone (e.g. the review was deleted) — just close the report.
        response = await prompt(
          'The reported content no longer exists. Close this report?\n\nExplain (the person who reported will see this):',
          'The reported content has already been removed.',
          { minLength: 5, submitLabel: 'Close report' }
        )
        if (response === null) return
      }
      await adminApi.resolveReport(r.id, response)
      showToast('Action taken and report resolved.')
      loadAll()
    } catch (e) { showToast(e.message, true) }
  }

  const exportCsv = () => {
    const rows = [
      ['Name', 'Category', 'City', 'Owner', 'Status', 'Rating', 'Reviews'],
      ...bizz.map(b => [b.name, b.category, b.city, b.owner_name, b.status, b.average_rating, b.review_count]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `localbiz-businesses-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const STATS = stats ? [
    { label: 'Total Businesses', val: stats.totalBusinesses, icon: Store, bg: '#e8f5ee' },
    { label: 'Total Users',      val: stats.totalUsers,      icon: Users, bg: '#e8eaf6' },
    { label: 'Pending',          val: stats.pendingApprovals,icon: Clock, bg: '#fff8e1' },
    { label: 'Reviews',          val: stats.totalReviews,    icon: Star,  bg: '#fce4ec' },
  ] : []

  return (
    <div className="dash">
      {/* SIDEBAR */}
      <aside className="dash-sb">
        <div className="dash-logo" onClick={()=>go('landing')}>
          <span style={{width:32,height:32,background:'var(--green-main)',borderRadius:8,display:'grid',placeItems:'center'}}><Store size={16} color="white"/></span>
          <span>LocalBiz</span>
        </div>
        <div className="dash-user">
          <div className="dash-av" style={{background:'#e64a19'}}>{(user?.full_name||'Admin').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <div><strong>{user?.full_name || 'Admin Panel'}</strong><span>Super Administrator</span></div>
        </div>
        <nav className="dash-nav">
          {TABS.map(t=>{
            const Icon = t==='Overview'?Store:t==='Pending Approvals'?Clock:t==='All Businesses'?Store:t==='Users'?Users:t==='Reports'?Flag:t==='Activity Log'?ClipboardList:SettingsIcon
            return (
              <button key={t} className={`dash-nav-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
                <span><Icon size={16}/></span>
                {t}
                {t==='Pending Approvals' && pending.length>0 && <span className="notif-badge">{pending.length}</span>}
                {t==='Reports' && reports.filter(r=>r.status==='pending').length>0 && <span className="notif-badge">{reports.filter(r=>r.status==='pending').length}</span>}
              </button>
            )
          })}
        </nav>
        <div className="dash-sb-foot">
          <button className="dash-nav-btn" onClick={()=>go('landing')}><span><Home size={16}/></span> Back to Home</button>
          <button className="dash-nav-btn red" onClick={()=>go('logout')}><span><LogOut size={16}/></span> Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="dash-main">
        {toast && <div className={`toast ${toastErr?'toast-error':''}`} style={{marginBottom:18}}>{toast}</div>}
        <div className="dash-topbar">
          <div><h1>{tab}</h1><p>Manage and monitor your LocalBiz platform</p></div>
          {tab==='Overview' && (
            <div style={{display:'flex',gap:10}}>
              <button className="btn-outline" onClick={()=>setTab('Pending Approvals')}><Clock size={14} style={{verticalAlign:'-2px',marginRight:4}}/>{pending.length} Pending</button>
              <button className="btn-primary" onClick={exportCsv}><Download size={14} style={{verticalAlign:'-2px',marginRight:4}}/>Export</button>
            </div>
          )}
        </div>

        {loading ? <p style={{color:'var(--gray-400)'}}>Loading dashboard…</p> : <>

        {/* OVERVIEW */}
        {tab==='Overview' && <>
          <div className="dash-stats">
            {STATS.map(s=>(
              <div key={s.label} className="stat-card" style={{background:s.bg}}>
                <span className="stat-icon"><s.icon size={20}/></span>
                <div className="stat-val">{s.val}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="dash-two-col">
            <div className="d-card">
              <h3>Pending Approvals</h3>
              {pending.length===0
                ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem',padding:'8px 0'}}><PartyPopper size={14} style={{verticalAlign:'-2px',marginRight:4}}/>No pending approvals</p>
                : pending.slice(0,3).map(b=>{
                  const Icon = getCategoryIcon(b.category)
                  return (
                    <div key={b.id} className="d-list-row">
                      <div className="d-emoji"><Icon size={18}/></div>
                      <div style={{flex:1}}><strong>{b.name}</strong><span>{b.owner_name} · {b.category}</span></div>
                      <button className="act-btn approve" onClick={()=>approve(b.id)}><CheckCircle2 size={14}/></button>
                      <button className="act-btn reject"  onClick={()=>reject(b.id)}><XCircle size={14}/></button>
                    </div>
                  )
                })
              }
              <button className="btn-outline" style={{width:'100%',marginTop:12}} onClick={()=>setTab('Pending Approvals')}>Manage All <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
            </div>
            <div className="d-card">
              <h3>Recent Users</h3>
              {users.slice(0,3).map(u=>(
                <div key={u.id} className="d-list-row">
                  <div className="dash-av" style={{width:34,height:34,fontSize:'0.66rem',background:u.user_type==='owner'?'var(--green-main)':'#5c6bc0',flexShrink:0}}>
                    {u.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1}}><strong>{u.full_name}</strong><span>{u.user_type}</span></div>
                </div>
              ))}
              <button className="btn-outline" style={{width:'100%',marginTop:12}} onClick={()=>setTab('Users')}>All Users <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
            </div>
          </div>
          <div className="d-card" style={{marginTop:18}}>
            <h3>Recent Reports</h3>
            {reports.length===0 ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem',padding:'8px 0'}}>No reports filed.</p> : (
              <table className="adm-table">
                <thead><tr><th>Type</th><th>Target</th><th>Reporter</th><th>Reason</th><th>Actions</th></tr></thead>
                <tbody>
                  {reports.filter(r=>r.status==='pending').slice(0,5).map(r=>(
                    <tr key={r.id}>
                      <td><span className="badge badge-green">{r.type}</span></td>
                      <td><strong>{r.business_name || 'Deleted business'}</strong>{r.type==='review' && r.review_comment && <p style={{fontSize:'0.72rem',color:'var(--gray-400)',marginTop:2}}>"{r.review_comment.slice(0,60)}{r.review_comment.length>60?'…':''}"</p>}</td>
                      <td>{r.reporter_name}</td>
                      <td>{r.reason}</td>
                      <td>
                        <div style={{display:'flex',gap:7,alignItems:'center'}}>
                          <button className="act-btn reject" onClick={()=>actOnReport(r)}>{r.type==='business'?'Suspend':'Delete Review'}</button>
                          <button className="act-btn approve" onClick={()=>dismiss(r.id)}>Dismiss</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>}

        {/* PENDING */}
        {tab==='Pending Approvals' && (
          <div className="d-card">
            {pending.length===0
              ? <div style={{textAlign:'center',padding:'50px 0'}}>
                  <PartyPopper size={40} style={{color:'var(--gray-400)',marginBottom:12}}/>
                  <h3 style={{fontFamily:'var(--font-display)',color:'var(--green-dark)',marginBottom:7}}>All caught up!</h3>
                  <p style={{color:'var(--gray-400)',fontSize:'0.88rem'}}>No pending business approvals at this time.</p>
                </div>
              : <table className="adm-table">
                  <thead><tr><th>Business</th><th>Owner</th><th>Photo</th><th>Category</th><th>City</th><th>Submitted</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pending.map(b=>(
                      <tr key={b.id}>
                        <td><strong>{b.name}</strong></td>
                        <td>
                          {b.owner_name}<br/>
                          <span style={{fontSize:'0.76rem',color:'var(--gray-400)'}}>{b.owner_email}</span><br/>
                          {b.owner_phone
                            ? <a href={`tel:${b.owner_phone.replace(/\s+/g,'')}`} style={{fontSize:'0.76rem',color:'var(--green-main)',fontWeight:600,display:'inline-flex',alignItems:'center',gap:4,marginTop:2}}>
                                <Phone size={12}/>{b.owner_phone}
                              </a>
                            : <span style={{fontSize:'0.76rem',color:'var(--gray-400)'}}>No phone on file</span>}
                        </td>
                        <td>
                          {b.photo_url
                            ? <img
                                src={`${SERVER_ORIGIN}${b.photo_url}`}
                                alt={`${b.name} submitted`}
                                className="pending-thumb"
                                onClick={()=>setPreviewPhoto(`${SERVER_ORIGIN}${b.photo_url}`)}
                                onError={e=>{e.target.style.display='none'; e.target.nextSibling.style.display='inline-flex'}}
                              />
                            : null}
                          <span style={{display: b.photo_url ? 'none' : 'inline-flex', alignItems:'center', gap:4, fontSize:'0.76rem', color:'var(--gray-400)'}}>
                            <ImageOff size={14}/>None
                          </span>
                        </td>
                        <td><span className="badge badge-green">{b.category}</span></td>
                        <td>{b.city}</td>
                        <td>{new Date(b.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <button className="act-btn approve" onClick={()=>approve(b.id)}><CheckCircle2 size={13} style={{verticalAlign:'-2px',marginRight:4}}/>Approve</button>
                            <button className="act-btn reject"  onClick={()=>reject(b.id)}><XCircle size={13} style={{verticalAlign:'-2px',marginRight:4}}/>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

        {previewPhoto && (
          <div className="photo-preview-overlay" onClick={()=>setPreviewPhoto(null)}>
            <img src={previewPhoto} alt="Submitted live photo preview" className="photo-preview-large" onClick={e=>e.stopPropagation()}/>
          </div>
        )}

        {/* ALL BUSINESSES */}
        {tab==='All Businesses' && (
          <div className="d-card">
            <table className="adm-table">
              <thead><tr><th>Business</th><th>Owner</th><th>Category</th><th>City</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bizz.map(b=>(
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.owner_name}</td>
                    <td><span className="badge badge-green">{b.category}</span></td>
                    <td>{b.city}</td>
                    <td><Star size={12} fill="currentColor" style={{verticalAlign:'-1px'}}/> {Number(b.average_rating).toFixed(1)}</td>
                    <td><span className={`badge ${b.status==='active'?'badge-active':b.status==='pending'?'badge-pending':'badge-suspended'}`}>{b.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:7,alignItems:'center'}}>
                        <button className={`act-btn ${b.status==='active'?'reject':'approve'}`} onClick={()=>toggleBiz(b)}>{b.status==='active'?'Suspend':'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USERS */}
        {tab==='Users' && (
          <div className="d-card">
            <table className="adm-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div className="dash-av" style={{width:30,height:30,fontSize:'0.6rem',background:u.user_type==='owner'?'var(--green-main)':'#5c6bc0',flexShrink:0}}>
                          {u.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <strong>{u.full_name}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.user_type==='owner'?'badge-verified':'badge-green'}`}>{u.user_type}</span></td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td><span className={`badge ${u.status==='active'?'badge-active':'badge-suspended'}`}>{u.status}</span></td>
                    <td>
                      <button className={`act-btn ${u.status==='active'?'reject':'approve'}`} onClick={()=>toggleUser(u)}>
                        {u.status==='active'?'Block':'Unblock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORTS */}
        {tab==='Reports' && (
          <div className="d-card">
            {reports.length===0 ? <p style={{color:'var(--gray-400)'}}>No reports filed.</p> : (
              <>
                {/* Filter buttons */}
                <div className="report-filters">
                  {['all','pending','reviewed','dismissed'].map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`filter-chip ${reportFilter===f ? 'active' : ''}`}
                      onClick={()=>setReportFilter(f)}
                    >
                      {f==='all' ? 'All' : f.charAt(0).toUpperCase()+f.slice(1)}
                      <span className="filter-count">
                        {f==='all' ? reports.length : reports.filter(r=>r.status===f).length}
                      </span>
                    </button>
                  ))}
                </div>

                {filteredReports.length===0 ? (
                  <p style={{color:'var(--gray-400)',padding:'12px 0'}}>No {reportFilter} reports.</p>
                ) : (
                  <table className="adm-table">
                    <thead><tr><th>Type</th><th>Target</th><th>Reported By</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredReports.map(r=>(
                        <tr key={r.id}>
                          <td><span className="badge badge-green">{r.type}</span></td>
                          <td>
                            <strong>{r.business_name || 'Deleted business'}</strong>
                            {r.type==='review' && r.review_comment && <p style={{fontSize:'0.72rem',color:'var(--gray-400)',marginTop:2}}>"{r.review_comment.slice(0,80)}{r.review_comment.length>80?'…':''}"</p>}
                          </td>
                          <td>{r.reporter_name}</td>
                          <td>{r.reason}</td>
                          <td>
                            {/* Clickable status badge: click to filter by this status, click again to show all */}
                            <button
                              type="button"
                              className={`badge badge-click ${r.status==='pending'?'badge-pending':r.status==='dismissed'?'badge-suspended':'badge-active'}`}
                              title={reportFilter===r.status ? 'Click to show all' : `Show only ${r.status} reports`}
                              onClick={()=>setReportFilter(reportFilter===r.status ? 'all' : r.status)}
                            >
                              {r.status}
                            </button>
                          </td>
                          <td>
                            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                              {r.status==='pending' ? <>
                                <button className="act-btn reject" onClick={()=>actOnReport(r)}>{r.type==='business'?'Suspend':'Delete Review'}</button>
                                <button className="act-btn approve" onClick={()=>dismiss(r.id)}>Dismiss</button>
                              </> : <div>
                                <span style={{fontSize:'0.78rem',color:'var(--gray-400)'}}>
                                  {r.status==='reviewed' ? 'Action taken' : 'No action needed'}
                                </span>
                                {r.admin_response && <p style={{fontSize:'0.74rem',color:'var(--gray-600)',marginTop:3,maxWidth:260,lineHeight:1.4}}>Admin: "{r.admin_response}"</p>}
                              </div>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {/* ACTIVITY LOG */}
        {tab==='Activity Log' && (
          <div className="d-card">
            {logs.length===0 ? <p style={{color:'var(--gray-400)'}}>No admin activity recorded yet.</p> : (
              <table className="adm-table">
                <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Notes</th></tr></thead>
                <tbody>
                  {logs.map(l=>(
                    <tr key={l.id}>
                      <td>{new Date(l.created_at).toLocaleString()}</td>
                      <td>{l.admin_name}</td>
                      <td><span className="badge badge-green">{l.action.replace(/_/g,' ')}</span></td>
                      <td>{l.target_name || `${l.target_type} #${l.target_id}`}</td>
                      <td>{l.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab==='Settings' && (
          <div className="d-card" style={{maxWidth:560}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.25rem',color:'var(--green-dark)',marginBottom:22}}>Platform Settings</h3>
            <p style={{color:'var(--gray-400)',fontSize:'0.86rem',marginBottom:18}}>Platform-wide settings (approval mode, review moderation) aren't backed by the API yet — this panel is a placeholder for a future milestone.</p>
            <div className="form-group"><label className="form-label">Platform Name</label><input className="form-input" defaultValue="LocalBiz — Pakistan" disabled/></div>
            <div className="form-group"><label className="form-label">Admin Email</label><input className="form-input" defaultValue={user?.email || 'admin@localbiz.pk'} disabled/></div>
          </div>
        )}
        </>}
      </main>
    </div>
  )
}
