import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Search, Star, CheckCircle2, Grid2x2, List as ListIcon, Map as MapIcon, Frown, ArrowRight, LocateFixed, X, Phone } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import BusinessMap from '../components/BusinessMap.jsx'
import { businessApi, SERVER_ORIGIN } from '../api.js'
import { getCategoryIcon } from '../categoryIcons.jsx'
import { CATEGORIES } from '../categories.js'
import { CITIES } from '../cities.js'
import { distanceKm, getCurrentLocation } from '../geo.js'
import { useGo } from '../useGo.js'
import CustomSelect from '../components/CustomSelect.jsx'
import './SearchPage.css'

const CATS = ['All', ...CATEGORIES]
const CITY_OPTS = ['All Cities', ...CITIES]

export default function SearchPage() {
  const go = useGo()
  const [searchParams, setSearchParams] = useSearchParams()

  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // The URL itself is the source of truth for search/category (?q=&category=)
  // so the page is bookmarkable/shareable and back/forward buttons work.
  const [q,       setQ]       = useState(() => searchParams.get('q') || '')
  const [cat,     setCat]     = useState(() => searchParams.get('category') || 'All')
  const [city,    setCity]    = useState('All Cities')
  const [ver,     setVer]     = useState(false)
  const [view,    setView]    = useState('grid')
  const [sort,    setSort]    = useState('Highest Rated')

  const [userLoc, setUserLoc]   = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState('')

  // Keep the URL query string in sync with the filters so the address bar
  // always reflects what's being shown (real, shareable URLs).
  useEffect(() => {
    const params = {}
    if (q) params.q = q
    if (cat !== 'All') params.category = cat
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat])

  const fetchTimeoutRef = useRef(null)
  // Bumped on every runSearch() call. A response only gets applied if it's
  // still the most recent request by the time it comes back — otherwise an
  // older, slower request (e.g. for a search term you've since cleared)
  // could resolve after the newer one and overwrite it with stale results.
  const requestIdRef = useRef(0)

  const runSearch = () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    const thisRequestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    const params = {}
    if (q) params.search = q
    if (cat !== 'All') params.category = cat
    if (city !== 'All Cities') params.city = city
    if (ver) params.verified = 'true'

    businessApi.getAll(params)
      .then(data => {
        if (thisRequestId !== requestIdRef.current) return // a newer search has already started — ignore this stale response
        setBusinesses(data)
      })
      .catch(e => {
        if (thisRequestId !== requestIdRef.current) return
        setError(e.message)
      })
      .finally(() => {
        if (thisRequestId === requestIdRef.current) setLoading(false)
      })
  }

  // Live-typing / filter-change search — small debounce so we don't fire a
  // request on every keystroke.
  useEffect(() => {
    fetchTimeoutRef.current = setTimeout(runSearch, 300)
    return () => clearTimeout(fetchTimeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, city, ver])

  // Pressing Enter or clicking "Search" runs the query immediately instead
  // of waiting out the debounce — makes the button a real action, not decoration.
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    runSearch()
  }

  const findNearMe = async () => {
    setLocError('')
    setLocLoading(true)
    // "Near Me" sorts the businesses that are already loaded — it does not
    // run a new search. A leftover search term (e.g. from an earlier query
    // that matched nothing) would otherwise keep the list empty and make
    // Near Me look broken, even though location was found successfully.
    setQ('')
    try {
      const loc = await getCurrentLocation()
      setUserLoc(loc)
      setSort('Nearest')
    } catch (e) {
      setLocError(e.message)
    } finally {
      setLocLoading(false)
    }
  }

  const clearFilters = () => {
    setQ('')
    setCat('All')
    setCity('All Cities')
    setVer(false)
  }

  const hasActiveFilters = q || cat !== 'All' || city !== 'All Cities' || ver

  const withDistance = businesses.map(b => ({
    ...b,
    distance: (userLoc && b.latitude && b.longitude)
      ? distanceKm(userLoc.lat, userLoc.lng, Number(b.latitude), Number(b.longitude))
      : null,
  }))

  const sorted = [...withDistance].sort((a, b) => {
    if (sort === 'Nearest') {
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    }
    if (sort === 'Highest Rated') return b.average_rating - a.average_rating
    if (sort === 'Most Reviews')  return b.review_count - a.review_count
    return 0
  })

  return (
    <div style={{minHeight:'100vh',background:'var(--off-white)'}}>
      <Navbar/>
      <div className="sp-topbar">
        <div className="sp-topbar-inner">
          <form className="sp-search-bar" onSubmit={handleSearchSubmit}>
            <CustomSelect className="sp-city-select" value={city} onChange={setCity} options={CITY_OPTS} placeholder="All Cities" />
            <input type="text" placeholder="Search businesses, categories..." value={q} onChange={e=>setQ(e.target.value)}/>
            {q && <button type="button" className="sp-clear-x" onClick={()=>setQ('')} title="Clear search"><X size={14}/></button>}
            <button type="submit"><Search size={14} style={{verticalAlign:'-2px',marginRight:4}}/>Search</button>
          </form>
          <button className="sp-nearme-btn" onClick={findNearMe} disabled={locLoading}>
            <LocateFixed size={14} style={{verticalAlign:'-2px',marginRight:5}}/>
            {locLoading ? 'Locating…' : 'Near Me'}
          </button>
        </div>
      </div>
      <div className="sp-layout">
        <aside className="sp-sidebar">
          <h3>Filters</h3>
          <div className="sf-section">
            <h4>Quick Filters</h4>
            <label className="sf-toggle"><input type="checkbox" checked={ver} onChange={e=>setVer(e.target.checked)}/> Verified Only</label>
          </div>
          {hasActiveFilters && (
            <button className="btn-outline" style={{width:'100%'}} onClick={clearFilters}>Clear All Filters</button>
          )}
        </aside>
        <main className="sp-results">
          <div className="sp-results-hdr">
            <div>
              <h2>{loading ? 'Searching…' : `${sorted.length} places found${city!=='All Cities' ? ` in ${city}` : ' across Pakistan'}`}</h2>
              <p>
                Showing businesses from the LocalBiz directory
                {q && <> for "<strong>{q}</strong>"</>}
              </p>
            </div>
            <div className="sp-controls">
              <CustomSelect
                className="sp-sort"
                value={sort}
                onChange={setSort}
                options={userLoc ? ['Highest Rated', 'Most Reviews', 'Nearest'] : ['Highest Rated', 'Most Reviews']}
              />
              <div className="sp-view-toggle">
                <button className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Grid2x2 size={15}/></button>
                <button className={view==='list'?'active':''} onClick={()=>setView('list')}><ListIcon size={15}/></button>
                <button className={view==='map'?'active':''} onClick={()=>setView('map')}><MapIcon size={15}/></button>
              </div>
            </div>
          </div>
          <div className="sp-pills">
            {CATS.map(c=>(
              <button key={c} className={`sp-pill ${cat===c?'active':''}`} onClick={()=>{ setCat(c); setQ('') }}>{c}</button>
            ))}
          </div>

          {error && <div className="toast toast-error" style={{marginBottom:16}}>{error}</div>}
          {locError && <div className="toast toast-error" style={{marginBottom:16}}>{locError}</div>}

          {view === 'map' ? (
            <BusinessMap businesses={sorted} onSelect={(b)=>go('detail', b)} height={480} />
          ) : (
            <div className={`sp-grid ${view==='list'?'list-view':''}`}>
              {!loading && sorted.length===0
                ? (
                  <div className="sp-empty">
                    <span><Frown size={34}/></span>
                    <h3>No businesses found</h3>
                    <p>Try adjusting or clearing your filters</p>
                    {hasActiveFilters && <button className="btn-primary" style={{marginTop:14}} onClick={clearFilters}>Clear All Filters</button>}
                  </div>
                )
                : sorted.map((b,i)=>{
                  const Icon = getCategoryIcon(b.category)
                  return (
                    <div key={b.id} className="sp-card card fade-up" style={{animationDelay:`${i*0.04}s`}} onClick={()=>go('detail',b)}>
                      <div className="sp-card-img">
                        {b.photo_url ? (
                          <>
                            <img
                              src={`${SERVER_ORIGIN}${b.photo_url}`}
                              alt={b.name}
                              style={{width:'100%',height:'100%',objectFit:'cover'}}
                              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline-flex' }}
                            />
                            <span style={{display:'none'}}><Icon size={36}/></span>
                          </>
                        ) : <span><Icon size={36}/></span>}
                      </div>
                      <div className="sp-card-body">
                        <div className="sp-card-top">
                          <span className="badge badge-green">{b.category}</span>
                          {!!b.is_verified && <span className="badge badge-verified"><CheckCircle2 size={11} style={{verticalAlign:'-1px'}}/> Verified</span>}
                          {b.distance != null && <span className="badge badge-green">{b.distance.toFixed(1)} km away</span>}
                        </div>
                        <div className="sp-name-row">
                          <h3>{b.name}</h3>
                          <span><Star size={13} fill="currentColor" style={{verticalAlign:'-2px'}}/> {Number(b.average_rating).toFixed(1)}</span>
                        </div>
                        <p className="sp-desc">{b.description}</p>
                        <p className="sp-addr"><MapPin size={13} style={{verticalAlign:'-2px'}}/> {b.address}, {b.city}</p>
                        <p className="sp-rev">{b.review_count} reviews</p>
                        <div className="sp-card-actions">
                          <button className="btn-outline" onClick={e=>{e.stopPropagation();go('detail',b)}}>View Details</button>
                          {b.phone ? (
                            <a className="btn-primary" href={`tel:${b.phone.replace(/\s+/g,'')}`} onClick={e=>e.stopPropagation()}>
                              <Phone size={13} style={{verticalAlign:'-2px',marginRight:5}}/>Call
                            </a>
                          ) : (
                            <button className="btn-primary" disabled onClick={e=>e.stopPropagation()} title="No phone number provided">
                              <Phone size={13} style={{verticalAlign:'-2px',marginRight:5}}/>Call
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
