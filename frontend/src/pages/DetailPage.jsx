import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  MapPin, Phone, Clock, CheckCircle2, Navigation, Bookmark, BookmarkCheck,
  Star, Flag, ImageOff, Camera, Megaphone,
} from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import BusinessMap from '../components/BusinessMap.jsx'
import { businessApi, reviewApi, promotionApi, SERVER_ORIGIN } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { getCategoryIcon } from '../categoryIcons.jsx'
import { useGo } from '../useGo.js'
import { getCurrentLocation } from '../geo.js'
import './DetailPage.css'

const Stars = ({ n, sz = '0.95rem' }) => (
  <span style={{ display: 'inline-flex', gap: 2, color: '#f5a623', fontSize: sz }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={sz === '1.25rem' ? 20 : sz === '1.15rem' ? 18 : 15} fill={i < Math.round(n) ? 'currentColor' : 'none'} strokeWidth={1.5} />
    ))}
  </span>
)

const SAVED_KEY = 'localbiz_saved'
const getSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || [] } catch { return [] } }

export default function DetailPage() {
  const { id } = useParams()
  const go = useGo()
  const { isLoggedIn, user } = useAuth()
  const { alert, prompt } = useUI()
  const [tab, setTab] = useState('overview')
  const [b, setB] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [promotions, setPromotions] = useState([])
  const [rev, setRev] = useState({ rating: 0, comment: '' })
  const [revErr, setRevErr] = useState('')
  const [revOk, setRevOk] = useState(false)
  const [saved, setSaved] = useState(() => getSaved().includes(Number(id)))
  const [reportOk, setReportOk] = useState(false)
  const [gettingDirections, setGettingDirections] = useState(false)
  const revOkRef = useRef(null)
  const mapCardRef = useRef(null)

  // The business is always fetched fresh by ID from the URL — this makes
  // the page a real, shareable, bookmarkable, reload-safe URL instead of
  // depending on data passed in from wherever the user clicked from.
  useEffect(() => {
    setB(null)
    setNotFound(false)
    businessApi.getById(id).then(setB).catch(() => setNotFound(true))
  }, [id])

  useEffect(() => {
    setLoadingReviews(true)
    reviewApi.getForBusiness(id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false))
  }, [id])

  useEffect(() => {
    promotionApi.getForBusiness(id).then(setPromotions).catch(() => setPromotions([]))
  }, [id])

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
        <Navbar />
        <div style={{ padding: 60, textAlign: 'center' }}>
          <p>Business not found. <button className="btn-primary" onClick={() => go('search')} style={{ marginLeft: 8 }}>Browse Directory</button></p>
        </div>
      </div>
    )
  }

  if (!b) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
        <Navbar />
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>Loading…</div>
      </div>
    )
  }

  const Icon = getCategoryIcon(b.category)
  const isOwnBusiness = isLoggedIn && user && Number(user.id) === Number(b.owner_id)
  const isAdminViewer = isLoggedIn && user?.user_type === 'admin'

  // A business that isn't 'active' yet (still pending admin approval, or
  // rejected/suspended) is deliberately left out of search/landing results
  // — but getBusinessById still returns it by ID for the owner to preview
  // and for admins to review. Anyone else landing here directly (e.g. by
  // guessing/visiting the URL) should see a clear notice instead of the
  // full public page and review form.
  const STATUS_NOTICE = {
    pending:   'This business listing is still pending admin approval and isn\'t public yet.',
    rejected:  'This business listing was not approved and isn\'t public.',
    suspended: 'This business listing has been suspended and isn\'t public right now.',
  }
  if (b.status !== 'active' && !isOwnBusiness && !isAdminViewer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
        <Navbar />
        <div style={{ padding: 60, textAlign: 'center' }}>
          <p>{STATUS_NOTICE[b.status] || 'This business listing is not currently public.'}</p>
          <button className="btn-primary" onClick={() => go('search')} style={{ marginTop: 16 }}>Browse Directory</button>
        </div>
      </div>
    )
  }

  const toggleSave = () => {
    const list = getSaved()
    const numId = Number(id)
    const next = saved ? list.filter(x => x !== numId) : [...list, numId]
    localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    setSaved(!saved)
  }

  // Just shows the business's own location (no route, no user origin involved) —
  // used as a fallback when we don't have the user's current position.
  const openMaps = () => {
    const query = encodeURIComponent(`${b.name}, ${b.address}, ${b.city}, Pakistan`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  // "LOCATION" hero button — jumps straight to the on-page map showing
  // exactly this business's location. Doesn't need geolocation at all.
  const viewLocation = () => {
    setTab('overview')
    setTimeout(() => mapCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  // Real turn-by-turn directions FROM the user's current position TO this
  // business — reuses the same getCurrentLocation() helper the "Near Me"
  // sort already relies on. Google Maps' dir/ link needs no API key to
  // simply open (only the JS/Geocoding APIs need a billing key), so this
  // stays free just like the rest of the map integration.
  const handleGetDirections = async () => {
    if (!b.latitude || !b.longitude) {
      await alert('This business has no map location saved yet, so directions are unavailable.')
      return
    }
    setGettingDirections(true)
    try {
      const { lat, lng } = await getCurrentLocation()
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${b.latitude},${b.longitude}&travelmode=driving`,
        '_blank'
      )
    } catch (err) {
      await alert('Could not get your current location (permission denied or unavailable). Showing the business location instead — you can search directions manually from there.')
      openMaps()
    } finally {
      setGettingDirections(false)
    }
  }

  const reportListing = async () => {
    if (!isLoggedIn) { go('login'); return }
    const reason = await prompt("What's wrong with this listing? (e.g. incorrect info, closed down, inappropriate content)")
    if (!reason || !reason.trim()) return
    try {
      await businessApi.report(id, reason)
      setReportOk(true)
      setTimeout(() => setReportOk(false), 3000)
    } catch (e) {
      await alert(e.message || 'Could not submit report.')
    }
  }

  const submitRev = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) { setRevErr('Please login to write a review.'); return }
    if (isOwnBusiness) { setRevErr('You cannot review your own business.'); return }
    if (!rev.rating) { setRevErr('Please select a star rating.'); return }
    if (!rev.comment.trim()) { setRevErr('Please write a comment.'); return }
    setRevErr('')
    try {
      await reviewApi.add(id, rev)
      setRevOk(true)
      setRev({ rating: 0, comment: '' })
      const fresh = await reviewApi.getForBusiness(id)
      setReviews(fresh)
      const freshBiz = await businessApi.getById(id)
      setB(freshBiz)
      // Scroll the confirmation into view — the review list re-renders
      // above the form, which can otherwise push the toast off-screen.
      setTimeout(() => revOkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      setTimeout(() => setRevOk(false), 4000)
    } catch (e2) {
      setRevErr(e2.message || 'Could not submit review.')
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--off-white)'}}>
      <Navbar/>
      <div className="dp-wrap">
        {/* BREADCRUMB */}
        <div className="dp-breadcrumb">
          <button onClick={()=>go('landing')}>Home</button>
          <span>/</span>
          <button onClick={()=>go('search')}>Directory</button>
          <span>/</span>
          <span>{b.name}</span>
        </div>

        {/* HERO */}
        <div className="dp-hero">
          <div className="dp-hero-img">
            {b.photo_url ? (
              <>
                <img
                  src={`${SERVER_ORIGIN}${b.photo_url}`}
                  alt={b.name}
                  style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline-flex' }}
                />
                <span style={{display:'none'}}><Icon size={48}/></span>
              </>
            ) : <span><Icon size={48}/></span>}
            {!!b.is_verified && <div className="dp-verified"><CheckCircle2 size={12} style={{verticalAlign:'-1px',marginRight:3}}/>VERIFIED</div>}
          </div>
          <div className="dp-hero-info">
            <div className="dp-badges">
              <span className="badge badge-green">{b.category || 'Business'}</span>
              {!!b.is_verified && <span className="badge badge-verified"><CheckCircle2 size={11} style={{verticalAlign:'-1px'}}/> Verified</span>}
              {isOwnBusiness && <span className="badge badge-pending">This is your listing</span>}
            </div>
            <h1>{b.name}</h1>
            <div className="dp-rating-row">
              <Stars n={b.average_rating || 0} sz="1.25rem"/>
              <strong>{Number(b.average_rating || 0).toFixed(1)}</strong>
              <span>({b.review_count ?? 0} reviews)</span>
            </div>
            <div className="dp-info-list">
              <div className="dp-info-row">
                <span><MapPin size={16}/></span>
                <div><strong>{b.address}</strong><span>{b.city}, Pakistan</span></div>
              </div>
              <div className="dp-info-row">
                <span><Phone size={16}/></span>
                <div><strong>{b.phone || 'Not provided'}</strong><span>Click to connect instantly</span></div>
                {b.phone && <a className="dp-call-btn" href={`tel:${b.phone.replace(/\s+/g,'')}`}>CALL</a>}
              </div>
              <div className="dp-info-row">
                <span><Clock size={16}/></span>
                <div><strong style={{color:'var(--green-accent)'}}>{b.hours || 'Hours not provided'}</strong></div>
              </div>
            </div>
            <div className="dp-actions">
              {b.phone && <a className="dp-act-btn" href={`tel:${b.phone.replace(/\s+/g,'')}`}><Phone size={14} style={{verticalAlign:'-2px',marginRight:5}}/>CALL</a>}
              <button className="dp-act-btn primary" onClick={viewLocation}><MapPin size={14} style={{verticalAlign:'-2px',marginRight:5}}/>LOCATION</button>
              <button className="dp-act-btn" onClick={toggleSave}>
                {saved ? <BookmarkCheck size={14} style={{verticalAlign:'-2px',marginRight:5}}/> : <Bookmark size={14} style={{verticalAlign:'-2px',marginRight:5}}/>}
                {saved ? 'SAVED' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>

        {promotions.length > 0 && (
          <div className="dp-promo-banner">
            <Megaphone size={16} style={{verticalAlign:'-3px',marginRight:6}}/>
            {promotions.map(p => (
              <span key={p.id} style={{marginRight:18}}>
                <strong>{p.title}</strong>{p.description ? ` — ${p.description}` : ''} (until {new Date(p.end_date).toLocaleDateString()})
              </span>
            ))}
          </div>
        )}

        {/* TABS */}
        <div className="dp-tabs">
          {['overview','reviews','hours','photos'].map(t=>(
            <button key={t} className={`dp-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab==='overview' && (
          <div className="dp-grid">
            <div className="dp-main">
              <div className="dp-card">
                <h3>About</h3>
                <p>{b.description || `Authentic local business serving the ${b.city} community with quality products and services.`}</p>
              </div>
              <div className="dp-card">
                <h3>Opening Hours</h3>
                <p style={{fontSize:'0.92rem',color:'var(--gray-600)'}}>{b.hours || 'Hours not provided by the business owner yet.'}</p>
              </div>
              <div className="dp-card" ref={mapCardRef}>
                <h3>Location on Map</h3>
                <BusinessMap businesses={[b]} height={260} />
                <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
                  <button className="btn-primary" style={{fontSize:'0.84rem'}} onClick={handleGetDirections} disabled={gettingDirections}>
                    <Navigation size={14} style={{verticalAlign:'-2px',marginRight:5}}/>
                    {gettingDirections ? 'Getting your location…' : 'Directions from My Location'}
                  </button>
                </div>
              </div>
            </div>
            <div className="dp-side">
              <div className="dp-card">
                <h3>Ratings & Reviews</h3>
                <div className="dp-rat-summary">
                  <div className="dp-big-rat">{Number(b.average_rating || 0).toFixed(1)}</div>
                  <div><Stars n={b.average_rating || 0} sz="1.15rem"/><p>{b.review_count ?? 0} TOTAL REVIEWS</p></div>
                </div>
              </div>
              {!isOwnBusiness && (
                <div className="dp-card">
                  <h3>Report this Listing</h3>
                  <p style={{fontSize:'0.83rem',color:'var(--gray-400)',marginBottom:12}}>Noticed incorrect or inappropriate information?</p>
                  <button className="btn-outline" style={{width:'100%'}} onClick={reportListing}><Flag size={13} style={{verticalAlign:'-2px',marginRight:5}}/>Report Listing</button>
                  {reportOk && <div className="toast" style={{marginTop:10}}><CheckCircle2 size={13} style={{verticalAlign:'-2px',marginRight:4}}/>Reported — thank you!</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REVIEWS */}
        {tab==='reviews' && (
          <div style={{maxWidth:680}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.25rem',color:'var(--green-dark)',marginBottom:22}}>
              Customer Reviews ({b.review_count ?? 0})
            </h3>
            {loadingReviews ? (
              <p style={{color:'var(--gray-400)'}}>Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p style={{color:'var(--gray-400)',marginBottom:18}}>No reviews yet. Be the first to share your experience!</p>
            ) : reviews.map((r) => (
              <div key={r.id} className="dp-review-card">
                <div className="dp-rev-hdr">
                  <div className="dp-rev-av">{(r.user_name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}><strong>{r.user_name}</strong><span>{new Date(r.created_at).toLocaleDateString()}</span></div>
                  <Stars n={r.rating}/>
                </div>
                <p>{r.comment}</p>
              </div>
            ))}

            {isOwnBusiness ? (
              <p style={{fontSize:'0.85rem',color:'var(--gray-400)',padding:'14px 0'}}>You can't review your own business.</p>
            ) : (
              <div className="dp-write-review">
                <h4>Write a Review</h4>
                {!isLoggedIn && <p style={{fontSize:'0.85rem',color:'var(--gray-400)',marginBottom:10}}>You need to <button onClick={()=>go('login')} style={{color:'var(--green-main)',fontWeight:600}}>login</button> to write a review.</p>}
                <form onSubmit={submitRev}>
                  <label style={{display:'block',fontSize:'0.8rem',color:'var(--gray-400)',marginBottom:6}}>Your Rating *</label>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} type="button"
                        aria-label={`Rate ${n} star${n>1?'s':''}`}
                        style={{background:'none',border:'none',cursor:'pointer',color:n<=rev.rating?'#f5a623':'#ddd',transition:'color 0.15s'}}
                        onClick={()=>setRev(r=>({...r,rating:n}))}>
                        <Star size={24} fill={n<=rev.rating?'currentColor':'none'} strokeWidth={1.5}/>
                      </button>
                    ))}
                    {!rev.rating && <span style={{fontSize:'0.78rem',color:'var(--gray-400)',marginLeft:6}}>Tap a star to rate</span>}
                  </div>
                  <textarea className="form-textarea" placeholder="Share your experience..." value={rev.comment} onChange={e=>setRev(r=>({...r,comment:e.target.value}))}/>
                  <button className="btn-primary" type="submit" style={{marginTop:10}}>Submit Review</button>
                  {revErr && <div className="toast toast-error" style={{marginTop:10}}>{revErr}</div>}
                  {revOk && (
                    <div ref={revOkRef} className="toast" style={{marginTop:10,fontSize:'0.95rem',fontWeight:600,padding:'12px 16px'}}>
                      <CheckCircle2 size={16} style={{verticalAlign:'-2px',marginRight:5}}/>Review submitted successfully!
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* HOURS */}
        {tab==='hours' && (
          <div className="dp-card" style={{maxWidth:480}}>
            <h3>Opening Hours</h3>
            <p style={{fontSize:'0.92rem',color:'var(--gray-600)'}}>{b.hours || 'Hours not provided by the business owner yet.'}</p>
          </div>
        )}

        {/* PHOTOS */}
        {tab==='photos' && (
          <div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.25rem',color:'var(--green-dark)',marginBottom:18}}>Photos</h3>
            {b.photo_url ? (
              <>
                <img
                  src={`${SERVER_ORIGIN}${b.photo_url}`}
                  alt={b.name}
                  style={{maxWidth:420,width:'100%',borderRadius:12}}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                />
                <div style={{display:'none',flexDirection:'column',alignItems:'center',gap:10,padding:'40px 0',color:'var(--gray-400)'}}>
                  <ImageOff size={36}/>
                  <p>Photo could not be loaded.</p>
                </div>
              </>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'40px 0',color:'var(--gray-400)'}}>
                <ImageOff size={36}/>
                <p>No photos uploaded yet.</p>
                <p style={{fontSize:'0.8rem'}}><Camera size={13} style={{verticalAlign:'-2px',marginRight:4}}/>Business owners can add live photos from their dashboard.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
