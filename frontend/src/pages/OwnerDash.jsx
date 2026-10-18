import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Store, BarChart3, Plus, Megaphone, Star, Settings as SettingsIcon, Home, LogOut,
  Trophy, Pencil, Trash2, Camera, CheckCircle2, AlertCircle, ArrowRight, ImageOff, X,
} from 'lucide-react'
import { businessApi, reviewApi, authApi, promotionApi, SERVER_ORIGIN } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { getCategoryIcon } from '../categoryIcons.jsx'
import { CATEGORIES } from '../categories.js'
import { CITIES } from '../cities.js'
import { useGo } from '../useGo.js'
import CustomSelect from '../components/CustomSelect.jsx'
import { formatPkPhone } from '../phone.js'
import './DashPage.css'

const TABS = ['Overview', 'My Listings', 'Add Business', 'Promotions', 'Reviews', 'Settings']
const EMPTY_FORM = { name: '', category: '', city: '', address: '', phone: '', description: '', hours: '' }

export default function OwnerDash() {
  const go = useGo()
  const { user } = useAuth()
  const { confirm, alert } = useUI()
  const [tab, setTab] = useState('Overview')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [ok, setOk] = useState(false)
  // Captures whether the just-completed save was an edit or a brand new
  // listing, at the moment of success — NOT read from `editingId` at render
  // time, because editingId gets reset to null right after saving, which
  // was flipping the confirmation message to the wrong text.
  const [okWasEdit, setOkWasEdit] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [listMsg, setListMsg] = useState('')

  // A Live Photo captured before the business has been saved yet (so there's
  // no real business ID to upload it against). Held locally as a File +
  // preview URL, then uploaded automatically right after the business is
  // created in submit() — the owner shouldn't have to save first and reopen
  // Edit just to attach a photo they already took.
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState('')

  const [reviewsByBiz, setReviewsByBiz] = useState({})
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLocalCapture = (file) => {
    setPendingPhoto(file)
    setPendingPhotoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }
  const clearPendingPhoto = () => {
    setPendingPhotoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return '' })
    setPendingPhoto(null)
  }

  const loadListings = useCallback(() => {
    setLoading(true)
    businessApi.getMine()
      .then(setListings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadListings() }, [loadListings])

  // Pull reviews for every owned business — used in the Overview + Reviews tabs.
  useEffect(() => {
    if (listings.length === 0) return
    setReviewsLoading(true)
    Promise.all(listings.map(l => reviewApi.getForBusiness(l.id).then(r => [l.id, r]).catch(() => [l.id, []])))
      .then(pairs => setReviewsByBiz(Object.fromEntries(pairs)))
      .finally(() => setReviewsLoading(false))
  }, [listings])

  const allReviews = Object.entries(reviewsByBiz).flatMap(([bizId, revs]) =>
    revs.map(r => ({ ...r, businessName: listings.find(l => String(l.id) === String(bizId))?.name }))
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const totalReviews = listings.reduce((sum, l) => sum + Number(l.review_count || 0), 0)
  const avgRating = listings.length
    ? (listings.reduce((sum, l) => sum + Number(l.average_rating || 0) * Number(l.review_count || 0), 0) / (totalReviews || 1)).toFixed(1)
    : '0.0'
  const pendingCount = listings.filter(l => l.status === 'pending').length

  const STATS = [
    { label: 'My Listings',  val: listings.length, icon: Store,    bg: '#e8f5ee' },
    { label: 'Total Reviews', val: totalReviews,    icon: Star,     bg: '#fff8e1' },
    { label: 'Avg Rating',   val: totalReviews ? avgRating : '—', icon: Trophy, bg: '#e8eaf6' },
    { label: 'Pending Approval', val: pendingCount, icon: AlertCircle, bg: '#fce4ec' },
  ]

  const startEdit = (l) => {
    setEditingId(l.id)
    setForm({ name: l.name, category: l.category, city: l.city || '', address: l.address, phone: l.phone || '', description: l.description || '', hours: l.hours || '' })
    clearPendingPhoto()
    setTab('Add Business')
  }

  const remove = async (id) => {
    if (!await confirm('Delete this business listing? This cannot be undone.')) return
    try {
      await businessApi.remove(id)
      loadListings()
      setListMsg('Business listing deleted.')
      setTimeout(() => setListMsg(''), 3000)
    } catch (e) {
      await alert(e.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.category || !form.city || !form.address) { setFormErr('Name, category, city and address are required.'); return }
    setFormErr('')
    const wasEditing = !!editingId
    try {
      if (wasEditing) {
        await businessApi.update(editingId, form)
        setForm(EMPTY_FORM)
        setEditingId(null)
      } else {
        const result = await businessApi.create(form)
        // If a Live Photo was captured before the business existed, upload
        // it now that we have a real business ID. A failed photo upload
        // shouldn't undo the fact the business itself saved fine.
        if (pendingPhoto) {
          try {
            await businessApi.uploadPhoto(result.businessId, pendingPhoto)
          } catch (photoErr) {
            setFormErr(`Business saved, but the photo could not be uploaded: ${photoErr.message}`)
          }
          clearPendingPhoto()
        }
        // Switch straight into "editing" the business we just created —
        // lets the owner immediately add/replace the photo from here too.
        setEditingId(result.businessId)
      }
      setOkWasEdit(wasEditing)
      setOk(true)
      loadListings()
      setTimeout(() => setOk(false), 3000)
    } catch (e2) {
      setFormErr(e2.message || 'Could not save business.')
    }
  }

  return (
    <div className="dash">
      {/* SIDEBAR */}
      <aside className="dash-sb">
        <div className="dash-logo" onClick={()=>go('landing')}>
          <span style={{width:32,height:32,background:'var(--green-main)',borderRadius:8,display:'grid',placeItems:'center'}}><Store size={16} color="white"/></span>
          <span>LocalBiz</span>
        </div>
        <div className="dash-user">
          <div className="dash-av">{(user?.full_name||'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <div><strong>{user?.full_name || 'Business Owner'}</strong><span>Business Owner</span></div>
        </div>
        <nav className="dash-nav">
          {TABS.map(t=>{
            const Icon = t==='Overview'?BarChart3:t==='My Listings'?Store:t==='Add Business'?Plus:t==='Promotions'?Megaphone:t==='Reviews'?Star:SettingsIcon
            return (
              <button key={t} className={`dash-nav-btn ${tab===t?'active':''}`} onClick={()=>{ setTab(t); if(t!=='Add Business'){setEditingId(null);setForm(EMPTY_FORM);clearPendingPhoto()}; if(t==='Reviews'||t==='Overview'){loadListings()} }}>
                <span><Icon size={16}/></span> {t}
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
        <div className="dash-topbar">
          <div>
            <h1>{tab==='Overview'?'Dashboard Overview':tab==='My Listings'?'My Business Listings':tab==='Add Business'?(editingId?'Edit Business':'Add New Business'):tab==='Promotions'?'Manage Promotions':tab==='Reviews'?'Customer Reviews':'Account Settings'}</h1>
            <p>Welcome back, {user?.full_name?.split(' ')[0] || 'Owner'}! Here's what's happening.</p>
          </div>
          {tab !== 'Add Business' && (
            <button className="btn-primary" onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);clearPendingPhoto();setTab('Add Business')}}>+ Add Business</button>
          )}
        </div>

        {error && <div className="toast toast-error" style={{marginBottom:16}}>{error}</div>}

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
              <h3>My Listings</h3>
              {loading ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>Loading…</p>
                : listings.length===0 ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>No businesses yet. Add your first one!</p>
                : listings.slice(0,3).map(l=>{
                  const Icon = getCategoryIcon(l.category)
                  return (
                    <div key={l.id} className="d-list-row">
                      <div className="d-emoji"><Icon size={18}/></div>
                      <div style={{flex:1}}><strong>{l.name}</strong><span>{l.category} · {l.city}</span></div>
                      <span className={`badge ${l.status==='active'?'badge-active':l.status==='pending'?'badge-pending':l.status==='rejected'?'badge-rejected':'badge-suspended'}`}>{l.status}</span>
                      {!!l.review_count && <span style={{fontWeight:700,fontSize:'0.87rem'}}><Star size={12} fill="currentColor" style={{verticalAlign:'-1px'}}/> {Number(l.average_rating).toFixed(1)}</span>}
                    </div>
                  )
                })}
              <button className="btn-outline" style={{width:'100%',marginTop:12}} onClick={()=>setTab('My Listings')}>Manage All <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
            </div>
            <div className="d-card">
              <h3>Recent Reviews</h3>
              {reviewsLoading ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>Loading…</p>
                : allReviews.length===0 ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>No reviews yet.</p>
                : allReviews.slice(0,3).map((r)=>(
                  <div key={r.id} className="d-rev-row">
                    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:4}}>
                      <strong>{r.user_name}</strong>
                      <span style={{color:'#f5a623',display:'inline-flex',gap:1}}>{Array.from({length:5}).map((_,i)=><Star key={i} size={12} fill={i<r.rating?'currentColor':'none'} strokeWidth={1.5}/>)}</span>
                      <span style={{marginLeft:'auto',fontSize:'0.74rem',color:'var(--gray-400)'}}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{fontSize:'0.78rem',color:'var(--gray-400)',marginBottom:2}}>on {r.businessName}</p>
                    <p>{r.comment}</p>
                  </div>
                ))}
              <button className="btn-outline" style={{width:'100%',marginTop:12}} onClick={()=>setTab('Reviews')}>View All <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
            </div>
          </div>
        </>}

        {/* MY LISTINGS */}
        {tab==='My Listings' && (
          <div className="d-card">
            {listMsg && <div className="toast" style={{marginBottom:14}}><CheckCircle2 size={13} style={{verticalAlign:'-2px',marginRight:4}}/>{listMsg}</div>}
            {loading ? <p style={{color:'var(--gray-400)'}}>Loading…</p>
              : listings.length===0 ? <p style={{color:'var(--gray-400)'}}>No businesses yet. Click "+ Add Business" to get started.</p>
              : listings.map(l=>{
                const Icon = getCategoryIcon(l.category)
                return (
                  <div key={l.id} className="d-list-row big" style={{flexWrap:'wrap'}}>
                    <div className="d-emoji big">
                      {l.photo_url ? (
                        <>
                          <img
                            src={`${SERVER_ORIGIN}${l.photo_url}`}
                            alt={l.name}
                            style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline-flex' }}
                          />
                          <Icon size={22} style={{display:'none'}}/>
                        </>
                      ) : <Icon size={22}/>}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <strong style={{display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.name}</strong>
                      <p>{l.category} · {l.city} · {l.review_count} reviews</p>
                      {l.status==='rejected' && <p style={{color:'var(--red)',fontSize:'0.76rem',marginTop:2}}>Rejected by admin{l.rejection_reason ? `: ${l.rejection_reason}` : ''}. Edit and resave to resubmit for review.</p>}
                      {l.status==='suspended' && <p style={{color:'var(--red)',fontSize:'0.76rem',marginTop:2}}>Suspended by admin{l.rejection_reason ? `: ${l.rejection_reason}` : ''}. Edit and resave to resubmit for review.</p>}
                      {l.status==='active' && l.approval_note && <p style={{color:'var(--green-main)',fontSize:'0.76rem',marginTop:2}}>Admin note: {l.approval_note}</p>}
                    </div>
                    <span className={`badge ${l.status==='active'?'badge-active':l.status==='pending'?'badge-pending':l.status==='rejected'?'badge-rejected':'badge-suspended'}`}>{l.status}</span>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn-outline" style={{padding:'7px 14px',fontSize:'0.8rem'}} onClick={()=>startEdit(l)}><Pencil size={13} style={{verticalAlign:'-2px',marginRight:4}}/>Edit</button>
                      <button style={{background:'var(--red)',color:'white',border:'none',borderRadius:'var(--radius-sm)',padding:'7px 14px',cursor:'pointer'}} onClick={()=>remove(l.id)}><Trash2 size={13}/></button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* ADD / EDIT BUSINESS */}
        {tab==='Add Business' && (
          <div className="d-card" style={{maxWidth:680}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.25rem',color:'var(--green-dark)',marginBottom:22}}>{editingId?'Edit Business Details':'New Business Details'}</h3>
            <form onSubmit={submit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="form-group"><label className="form-label">Business Name *</label><input className="form-input" placeholder="e.g. My Restaurant" value={form.name} onChange={e=>upd('name',e.target.value)} required/></div>
                <div className="form-group"><label className="form-label">Category *</label><CustomSelect className="form-select" value={form.category} onChange={v=>upd('category',v)} options={CATEGORIES} placeholder="Select Category" /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="form-group"><label className="form-label">City *</label><CustomSelect className="form-select" value={form.city} onChange={v=>upd('city',v)} options={CITIES} placeholder="Select City" /></div>
                <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" placeholder="0300 1234567" value={form.phone} onChange={e=>upd('phone',formatPkPhone(e.target.value))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Business Address *</label><input className="form-input" placeholder="Street, Area" value={form.address} onChange={e=>upd('address',e.target.value)} required/></div>
              <div className="form-group"><label className="form-label">Opening Hours</label><input className="form-input" placeholder="e.g. 9AM – 10PM" value={form.hours} onChange={e=>upd('hours',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Business Description</label><textarea className="form-textarea" placeholder="Describe your business, products and services..." value={form.description} onChange={e=>upd('description',e.target.value)}/></div>

              {editingId ? (
                <PhotoUploader businessId={editingId} onUploaded={loadListings} />
              ) : (
                <PhotoUploader
                  localMode
                  localPreview={pendingPhotoPreview}
                  onLocalCapture={handleLocalCapture}
                  onClearLocal={clearPendingPhoto}
                />
              )}

              {formErr && <div className="toast toast-error" style={{marginTop:12}}>{formErr}</div>}
              <button className="btn-primary" type="submit" style={{width:'100%',marginTop:18,padding:'13px',justifyContent:'center'}}>{editingId?'Save Changes':'Submit for Verification'}</button>
              {ok && <div className="toast" style={{marginTop:12}}><CheckCircle2 size={14} style={{verticalAlign:'-2px',marginRight:4}}/>{okWasEdit?'Business updated!':'Business submitted! Admin will review it shortly.'}</div>}
            </form>
          </div>
        )}

        {/* PROMOTIONS */}
        {tab==='Promotions' && <OwnerPromotions listings={listings} />}

        {/* REVIEWS */}
        {tab==='Reviews' && (
          <div>
            {reviewsLoading ? <p style={{color:'var(--gray-400)'}}>Loading…</p>
              : allReviews.length===0 ? <p style={{color:'var(--gray-400)'}}>No reviews on your listings yet.</p>
              : allReviews.map((r)=>(
                <div key={r.id} className="d-card" style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:6}}>
                    <strong>{r.user_name} <span style={{fontWeight:400,color:'var(--gray-400)',fontSize:'0.78rem'}}>on {r.businessName}</span></strong>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{color:'#f5a623',display:'inline-flex',gap:1}}>{Array.from({length:5}).map((_,i)=><Star key={i} size={14} fill={i<r.rating?'currentColor':'none'} strokeWidth={1.5}/>)}</span>
                      <span style={{fontSize:'0.78rem',color:'var(--gray-400)'}}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p style={{fontSize:'0.87rem',color:'var(--gray-600)'}}>{r.comment}</p>
                </div>
              ))}
          </div>
        )}

        {/* SETTINGS */}
        {tab==='Settings' && <OwnerSettings user={user} />}
      </main>
    </div>
  )
}

function PhotoUploader({ businessId, onUploaded, localMode = false, localPreview = '', onLocalCapture, onClearLocal }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Stop the camera hardware and release it — must be called whenever we're
  // done with the camera (capture, cancel, or the component unmounting),
  // otherwise the camera light stays on and the device stays locked.
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  useEffect(() => () => stopCamera(), [])

  const openCamera = async () => {
    setErr('')
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.')
      }
      // facingMode 'environment' asks for the back camera on a phone (better
      // for photographing a business/storefront); on a laptop with a single
      // webcam, the browser just falls back to that one webcam.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      // videoRef isn't mounted until cameraOpen renders the <video> tag, so
      // attach the stream right after — a microtask later is enough since
      // React has already committed the state update by then.
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 0)
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        setErr('Camera permission was denied. Please allow camera access and try again.')
      } else if (e.name === 'NotFoundError') {
        setErr('No camera was found on this device.')
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setErr('Camera access needs a secure connection (https) or localhost — it will not work over a plain http:// LAN address.')
      } else {
        setErr(e.message || 'Could not access the camera.')
      }
    } finally {
      setStarting(false)
    }
  }

  const captureAndUpload = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    stopCamera()

    canvas.toBlob(async (blob) => {
      if (!blob) { setErr('Could not capture the photo. Please try again.'); return }
      const file = new File([blob], `live-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

      // No business ID yet (still filling in the "Add Business" form) —
      // hold the captured photo locally instead of uploading. The parent
      // uploads it right after the business is created.
      if (localMode) {
        onLocalCapture?.(file)
        setOk(true)
        setTimeout(() => setOk(false), 3000)
        return
      }

      setUploading(true)
      setErr('')
      try {
        await businessApi.uploadPhoto(businessId, file)
        setOk(true)
        onUploaded?.()
        setTimeout(() => setOk(false), 3000)
      } catch (e2) {
        setErr(e2.message || 'Upload failed.')
      } finally {
        setUploading(false)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="upload-area">
      {localPreview ? (
        <>
          <img src={localPreview} alt="Captured live photo" style={{width:110,height:110,objectFit:'cover',borderRadius:12,marginBottom:4}} />
          <p>Photo captured <small>It will be uploaded automatically once you submit this business.</small></p>
          <button type="button" className="btn-outline" style={{marginTop:8}} onClick={onClearLocal}>Retake Photo</button>
        </>
      ) : (
        <>
          <span>{uploading ? <ImageOff size={26} /> : <Camera size={26}/>}</span>
          <p>Upload Live Photo <small>Opens your camera directly — no gallery/file picker, so the photo is guaranteed fresh (max 5MB)</small></p>

          {!cameraOpen && (
            <button type="button" className="btn-outline" style={{marginTop:8}} disabled={starting || uploading} onClick={openCamera}>
              {starting ? 'Opening camera…' : uploading ? 'Uploading…' : 'Open Camera'}
            </button>
          )}
        </>
      )}

      {cameraOpen && (
        <div style={{marginTop:12, width:'100%', maxWidth:420}}>
          <div style={{position:'relative', width:'100%', borderRadius:12, overflow:'hidden', background:'#000'}}>
            <video ref={videoRef} autoPlay playsInline muted style={{width:'100%', display:'block'}} />
            <button
              type="button"
              onClick={stopCamera}
              aria-label="Cancel"
              style={{position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.55)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}
            >
              <X size={16} color="#fff" />
            </button>
          </div>
          <button type="button" className="btn-primary" style={{marginTop:10, width:'100%'}} onClick={captureAndUpload}>
            <Camera size={15} style={{verticalAlign:'-2px', marginRight:6}} />Capture Photo
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {err && <div className="toast toast-error" style={{marginTop:10}}>{err}</div>}
      {ok && (
        <div className="toast" style={{marginTop:10}}>
          <CheckCircle2 size={13} style={{verticalAlign:'-2px',marginRight:4}}/>
          {localMode ? 'Photo captured!' : 'Photo uploaded!'}
        </div>
      )}
    </div>
  )
}

function OwnerSettings({ user }) {
  const { updateUser } = useAuth()
  const [name, setName]   = useState(user?.full_name || '')
  const [phone, setPhone] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [ok, setOk]   = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    authApi.profile()
      .then(p => { setName(p.full_name || ''); setPhone(p.phone || '') })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const save = async () => {
    setErr('')
    try {
      await authApi.updateProfile({ full_name: name, phone })
      updateUser({ full_name: name })
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="d-card" style={{maxWidth:560}}>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.25rem',color:'var(--green-dark)',marginBottom:22}}>Account Settings</h3>
      {!loaded ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>Loading…</p> : <>
        <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={user?.email||''} disabled/></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={e=>setPhone(formatPkPhone(e.target.value))} placeholder="0300 1234567"/></div>
        {err && <div className="toast toast-error">{err}</div>}
        {ok && <div className="toast"><CheckCircle2 size={14} style={{verticalAlign:'-2px',marginRight:4}}/>Profile updated!</div>}
        <button className="btn-primary" style={{justifyContent:'center',marginTop:4}} onClick={save}>Save Changes</button>
      </>}
    </div>
  )
}

function OwnerPromotions({ listings }) {
  const { confirm, alert } = useUI()
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ business_id: '', title: '', description: '', start_date: '', end_date: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [delMsg, setDelMsg] = useState('')

  const activeListings = listings.filter(l => l.status === 'active')

  const load = () => {
    setLoading(true)
    promotionApi.getMine().then(setPromotions).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.business_id || !form.title || !form.start_date || !form.end_date) {
      setErr('Please fill in business, title, start date and end date.')
      return
    }
    setErr('')
    try {
      await promotionApi.add(form)
      setOk(true)
      setForm({ business_id: '', title: '', description: '', start_date: '', end_date: '' })
      load()
      setTimeout(() => setOk(false), 3000)
    } catch (e2) {
      setErr(e2.message || 'Could not add promotion.')
    }
  }

  const remove = async (id) => {
    if (!await confirm('Delete this promotion?')) return
    try {
      await promotionApi.remove(id)
      load()
      setDelMsg('Promotion deleted.')
      setTimeout(() => setDelMsg(''), 3000)
    } catch (e) {
      await alert(e.message)
    }
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
      <div className="d-card">
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.15rem',color:'var(--green-dark)',marginBottom:18}}>New Promotion</h3>
        {activeListings.length === 0 ? (
          <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>Promotions can only be added to <strong>active (approved)</strong> businesses. Add or wait for approval on a listing first.</p>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Business *</label>
              <CustomSelect
                className="form-select"
                value={form.business_id}
                onChange={v => upd('business_id', v)}
                options={activeListings.map(l => ({ value: String(l.id), label: l.name }))}
                placeholder="Select business"
              />
            </div>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" placeholder="e.g. 20% Off This Weekend" value={form.title} onChange={e=>upd('title', e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Details about the offer..." value={form.description} onChange={e=>upd('description', e.target.value)}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={form.start_date} onChange={e=>upd('start_date', e.target.value)}/></div>
              <div className="form-group"><label className="form-label">End Date *</label><input className="form-input" type="date" value={form.end_date} onChange={e=>upd('end_date', e.target.value)}/></div>
            </div>
            {err && <div className="toast toast-error">{err}</div>}
            {ok && <div className="toast"><CheckCircle2 size={14} style={{verticalAlign:'-2px',marginRight:4}}/>Promotion added!</div>}
            <button className="btn-primary" type="submit" style={{marginTop:6}}>Add Promotion</button>
          </form>
        )}
      </div>
      <div className="d-card">
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.15rem',color:'var(--green-dark)',marginBottom:18}}>My Promotions</h3>
        {delMsg && <div className="toast" style={{marginBottom:14}}><CheckCircle2 size={13} style={{verticalAlign:'-2px',marginRight:4}}/>{delMsg}</div>}
        {loading ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>Loading…</p>
          : promotions.length === 0 ? <p style={{color:'var(--gray-400)',fontSize:'0.86rem'}}>No promotions yet.</p>
          : promotions.map(p => {
            const expired = new Date(p.end_date) < new Date()
            return (
              <div key={p.id} className="d-list-row" style={{alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <strong>{p.title}</strong>
                  <p style={{margin:'2px 0'}}>{p.business_name}</p>
                  <span style={{fontSize:'0.74rem',color:'var(--gray-400)'}}>{new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}</span>
                </div>
                <span className={`badge ${expired ? 'badge-suspended' : 'badge-active'}`}>{expired ? 'Expired' : 'Active'}</span>
                <button style={{background:'var(--red)',color:'white',border:'none',borderRadius:'var(--radius-sm)',padding:'6px 10px',cursor:'pointer'}} onClick={()=>remove(p.id)}><Trash2 size={13}/></button>
              </div>
            )
          })}
      </div>
    </div>
  )
}
