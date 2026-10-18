import { useState, useEffect } from 'react'
import {
  Leaf, Search, MapPin, ArrowRight, Star,
  Utensils, ShoppingBag, Wrench, Pill, GraduationCap, Scissors, Dumbbell, Car,
  MapPinned, CheckCircle2, Megaphone, ShieldCheck,
} from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { businessApi, SERVER_ORIGIN } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { getCategoryIcon } from '../categoryIcons.jsx'
import { useGo } from '../useGo.js'
import './LandingPage.css'

// category label -> real category value stored in the DB (see categories.js).
// Clicking a category card filters the directory by that exact value.
const CATS = [
  { icon: Utensils,      name: 'Restaurants', value: 'Restaurant' },
  { icon: ShoppingBag,   name: 'Retail',       value: 'Retail' },
  { icon: Wrench,        name: 'Services',     value: 'Services' },
  { icon: Pill,          name: 'Health',       value: 'Health' },
  { icon: GraduationCap, name: 'Education',    value: 'Education' },
  { icon: Scissors,      name: 'Beauty',       value: 'Beauty' },
  { icon: Dumbbell,      name: 'Fitness',      value: 'Fitness' },
  { icon: Car,           name: 'Auto',         value: 'Auto' },
]

const FEATURES = [
  { icon: MapPinned,    title: 'Interactive Map',  desc: 'Precise geolocation allows customers to find your exact business with map pins and turn-by-turn directions.', variant: 'white' },
  { icon: CheckCircle2, title: 'Verified Reviews',          desc: 'Build credibility with customer feedback. Every review is authenticated through our local trust framework.', variant: 'pale' },
  { icon: Megaphone,    title: 'Active Promotions',         desc: 'Drive foot traffic with targeted seasonal offers and limited-time discounts visible to thousands of users.', variant: 'white' },
  { icon: ShieldCheck,  title: 'Business Verification',     desc: 'Earn the Verified Badge and priority ranking in local searches after admin approval.', variant: 'pale', dark: true },
]

export default function LandingPage() {
  const go = useGo()
  const { isLoggedIn, user } = useAuth()
  const { alert } = useUI()
  const [q, setQ] = useState('')
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    businessApi.getAll()
      .then(data => { if (active) setAll(data) })
      .catch(() => { if (active) setAll([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const featured = [...all].sort((a, b) => b.average_rating - a.average_rating).slice(0, 3)

  // Real numbers from the live directory instead of hardcoded marketing copy.
  const totalCount = all.length
  const cityCount  = new Set(all.map(b => b.city)).size
  const avgRating  = all.length
    ? (all.reduce((sum, b) => sum + Number(b.average_rating || 0), 0) / all.length).toFixed(1)
    : '—'

  const isOwner = isLoggedIn && user?.user_type === 'owner'
  const isAdmin = isLoggedIn && user?.user_type === 'admin'
  const isCustomer = isLoggedIn && user?.user_type === 'customer'

  // "Start Verification" needs an owner account with a business attached
  // before an admin can verify anything. What that means depends on who's
  // clicking it:
  //  - logged out           -> go create an owner account (Register page)
  //  - logged in as customer -> can't just "become" an owner on the same
  //    account (one email = one fixed account type in this system), so
  //    explain that clearly instead of silently opening a blank signup form
  //  - logged in as owner    -> handled separately below (goes to dashboard)
  const startVerification = async () => {
    if (isCustomer) {
      await alert("You're logged in as a Customer. To list and verify a business, register a separate Business Owner account with a different email — customer and owner accounts are kept separate for security.")
      return
    }
    go('register', { intent: 'verification' })
  }

  return (
    <div className="lp">
      <Navbar />

      {/* HERO */}
      <section className="hero">
        <div className="hero-left fade-up">
          <span className="hero-tag"><Leaf size={13} style={{verticalAlign:'-2px',marginRight:5}}/>Pakistan's Local Business Guide</span>
          <h1 className="hero-h1">Discover Local<br/><span className="hero-accent">Businesses</span><br/>Near You</h1>
          <p className="hero-sub">Connecting communities across Pakistan with trusted artisans, retailers, and services. Your modern almanac for local discovery.</p>
          <form className="hero-search" onSubmit={e=>{e.preventDefault();go('search',{search:q})}}>
            <span className="hs-icon"><Search size={16}/></span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for food, shops, or services..." />
            <button type="submit">Find</button>
          </form>
          <div className="hero-stats">
            <div className="hstat"><strong>{loading ? '—' : `${totalCount}+`}</strong><span>Active Shops</span></div>
            <div className="hstat-div"/>
            <div className="hstat"><strong><Star fill="currentColor"/>{avgRating}</strong><span>Avg Rating</span></div>
            <div className="hstat-div"/>
            <div className="hstat"><strong>{loading ? '—' : cityCount}</strong><span>Cities Covered</span></div>
          </div>
        </div>
        <div className="hero-right fade-up">
          <div className="map-box">
            <div className="map-bg">
              <div className="map-grid-lines"/>
              <span className="mp mp1"><MapPin size={20}/></span>
              <span className="mp mp2"><MapPin size={20}/></span>
              <span className="mp mp3"><MapPin size={20}/></span>
              <p className="map-lbl">Pakistan Business Map</p>
              <button className="map-btn" onClick={()=>go('search')}>Explore Map <ArrowRight size={14} style={{verticalAlign:'-2px'}}/></button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section bg-off">
        <div className="container">
          <div className="sec-hdr fade-up"><h2>Browse by Category</h2><p>Explore verified local businesses across Pakistan</p></div>
          <div className="cats-grid">
            {CATS.map((c,i)=>{
              const count = all.filter(b => b.category === c.value).length
              return (
                <div key={i} className="cat-card fade-up" style={{animationDelay:`${i*0.05}s`}} onClick={()=>go('search',{category:c.value})}>
                  <span className="cat-icon"><c.icon size={26}/></span>
                  <h4>{c.name}</h4>
                  <span>{count} listed</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section bg-white">
        <div className="container">
          <div className="sec-hdr fade-up"><h2>Featured Businesses</h2><p>Top-rated and verified businesses near you</p></div>
          <div className="feat-grid">
            {loading ? (
              <p style={{color:'var(--gray-400)'}}>Loading businesses…</p>
            ) : featured.length === 0 ? (
              <p style={{color:'var(--gray-400)'}}>No businesses listed yet — be the first to register!</p>
            ) : featured.map((b,i)=>{
              const Icon = getCategoryIcon(b.category)
              return (
                <div key={b.id} className="biz-card card fade-up" style={{animationDelay:`${i*0.1}s`}} onClick={()=>go('detail',b)}>
                  <div className="biz-img">
                    {b.photo_url ? (
                      <>
                        <img
                          src={`${SERVER_ORIGIN}${b.photo_url}`}
                          alt={b.name}
                          style={{width:'100%',height:'100%',objectFit:'cover'}}
                          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline-flex' }}
                        />
                        <span style={{display:'none'}}><Icon size={40}/></span>
                      </>
                    ) : <span><Icon size={40}/></span>}
                    {!!b.is_verified && <span className="open-tag open"><CheckCircle2 size={11} style={{verticalAlign:'-1px',marginRight:3}}/>Verified</span>}
                  </div>
                  <div className="biz-body">
                    <div className="biz-top">
                      <span className="badge badge-green">{b.category}</span>
                      <span className="biz-rat"><Star fill="currentColor"/>{Number(b.average_rating).toFixed(1)}</span>
                    </div>
                    <h3>{b.name}</h3>
                    <p className="biz-addr"><MapPin size={13} style={{verticalAlign:'-2px'}}/> {b.address}, {b.city}</p>
                    <div className="biz-foot">
                      <span>{b.review_count} reviews</span>
                      <button className="btn-outline" onClick={e=>{e.stopPropagation();go('detail',b)}}>View Details <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="center-btn">
            <button className="btn-primary" onClick={()=>go('search')}>View All Businesses</button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section bg-off">
        <div className="container">
          <div className="sec-hdr fade-up"><h2>Designed for Growth</h2><p>Tools for local enterprises to compete in a digital-first economy</p></div>
          <div className="feat2-grid">
            {FEATURES.map((f,i)=>(
              <div key={i} className={`feat2-card feat2-${f.variant} fade-up`} style={{animationDelay:`${i*0.08}s`}}>
                <span className="feat2-icon"><f.icon size={28}/></span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.dark && !isOwner && !isAdmin && (
                  <button className="btn-outline" style={{marginTop:14}} onClick={startVerification}>Start Verification <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
                )}
                {f.dark && isOwner && (
                  <button className="btn-outline" style={{marginTop:14}} onClick={()=>go('owner')}>Go to My Dashboard <ArrowRight size={13} style={{verticalAlign:'-2px'}}/></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — only relevant to visitors who could actually register a business */}
      {!isOwner && !isAdmin && (
        <section className="cta-section">
          <h2>Put Your Business on Pakistan's Digital Map</h2>
          <p>{totalCount > 0 ? `Join ${totalCount} local owners growing their brand through our community support platform.` : 'Be among the first local owners to grow your brand through our community support platform.'}</p>
          <div className="cta-btns">
            <button className="cta-btn-w" onClick={()=>go('register')}>Register Business</button>
            <button className="cta-btn-o" onClick={()=>go('search')}>Browse Directory</button>
          </div>
        </section>
      )}

      <Footer/>
    </div>
  )
}
