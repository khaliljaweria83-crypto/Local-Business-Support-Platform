import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { ArrowLeft, Mail, MapPin, Clock } from 'lucide-react'
import { useGo } from '../useGo.js'

export default function ContactPage() {
  const go = useGo()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '50px 24px' }}>
        <button onClick={() => go('landing')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green-main)', fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: '0.88rem' }}>
          <ArrowLeft size={15} /> Back to Home
        </button>

        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-dark)', marginBottom: 10 }}>Contact Us</h1>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 30 }}>
          Have a question, found an issue, or want to report something about a listing? Reach out to us using any of
          the details below.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ContactRow icon={<Mail size={18} />} label="Email" value="support@localbiz.pk" href="mailto:support@localbiz.pk" />
          <ContactRow icon={<MapPin size={18} />} label="Location" value="GIOC, Gujranwala, Punjab, Pakistan" />
          <ContactRow icon={<Clock size={18} />} label="Response Time" value="We usually reply within 1–2 business days." />
        </div>
      </div>
      <Footer />
    </div>
  )
}

function ContactRow({ icon, label, value, href }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ color: 'var(--green-main)', marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
        {href
          ? <a href={href} style={{ color: 'var(--gray-800)', fontSize: '0.92rem', fontWeight: 600, textDecoration: 'none' }}>{value}</a>
          : <div style={{ color: 'var(--gray-800)', fontSize: '0.92rem', fontWeight: 600 }}>{value}</div>}
      </div>
    </div>
  )
}
