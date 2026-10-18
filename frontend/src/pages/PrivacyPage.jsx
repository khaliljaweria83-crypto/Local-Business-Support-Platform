import { ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { useGo } from '../useGo.js'

export default function PrivacyPage() {
  const go = useGo()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '50px 24px' }}>
        <button onClick={() => go('landing')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green-main)', fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: '0.88rem' }}>
          <ArrowLeft size={15} /> Back to Home
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-dark)', marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginBottom: 30 }}>Last updated: July 2026</p>

        <Section title="1. Information We Collect">
          When you create an account we store your full name, email address, hashed password, and account type (customer, business owner). If you register a business, we also store the business name, category, city, address, phone number, and description you provide.
        </Section>
        <Section title="2. How We Use Your Information">
          Your information is used to operate your account, display your business listing and reviews publicly, and send you email notifications about your business (such as approval or rejection) or password reset requests.
        </Section>
        <Section title="3. Password Security">
          Passwords are never stored in plain text — they are hashed using bcrypt before being saved to the database. We cannot see or recover your original password.
        </Section>
        <Section title="4. Location Data">
          If you use the "Near Me" feature, your device's location is used only in your browser to sort search results by distance — it is not sent to or stored on our server.
        </Section>
        <Section title="5. Data Sharing">
          We do not sell or share your personal data with third parties. Business address information is geocoded via OpenStreetMap's Nominatim service solely to place a map pin.
        </Section>
        <Section title="6. Your Rights">
          You can update your profile information at any time from your dashboard. To request account deletion, please contact an administrator.
        </Section>
        <Section title="7. Academic Project Notice">
          This platform is a Final Year Design Project (BSIT22-G3, GIOC Gujranwala) built for educational purposes and is not a commercial product.
        </Section>
      </div>
      <Footer />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{ color: 'var(--green-dark)', fontSize: '1.02rem', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.7 }}>{children}</p>
    </div>
  )
}
