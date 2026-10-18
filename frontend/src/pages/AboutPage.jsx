import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { ArrowLeft, ShieldCheck, Users, MapPin } from 'lucide-react'
import { useGo } from '../useGo.js'

export default function AboutPage() {
  const go = useGo()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '50px 24px' }}>
        <button onClick={() => go('landing')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green-main)', fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: '0.88rem' }}>
          <ArrowLeft size={15} /> Back to Home
        </button>

        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-dark)', marginBottom: 10 }}>About LocalBiz</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginBottom: 30 }}>FYDP 2026 · GIOC Gujranwala · BSIT22-G3</p>

        <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 16 }}>
          LocalBiz is a local business discovery platform built as a Final Year Design Project. Our goal is to help
          small and local businesses across Pakistan get discovered online, and to help customers find verified,
          trustworthy businesses in their own city without relying on word-of-mouth alone.
        </p>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 30 }}>
          Every business listed on LocalBiz goes through an admin review process before it becomes publicly visible,
          and customers can leave genuine, verified reviews to help others make informed decisions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 20, marginBottom: 10 }}>
          <Feature icon={<ShieldCheck size={20} />} title="Verified Listings" text="Every business is reviewed by an admin before going live." />
          <Feature icon={<Users size={20} />} title="Real Reviews" text="Only genuine customers can leave a rating and review." />
          <Feature icon={<MapPin size={20} />} title="Local Focus" text="Built around cities and categories across Pakistan." />
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Feature({ icon, title, text }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 16px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ color: 'var(--green-main)', marginBottom: 10 }}>{icon}</div>
      <h4 style={{ fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 6 }}>{title}</h4>
      <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}
