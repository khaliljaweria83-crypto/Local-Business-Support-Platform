import { Store, ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { useGo } from '../useGo.js'

export default function TermsPage() {
  const go = useGo()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '50px 24px' }}>
        <button onClick={() => go('landing')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green-main)', fontWeight: 600, cursor: 'pointer', marginBottom: 24, fontSize: '0.88rem' }}>
          <ArrowLeft size={15} /> Back to Home
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-dark)', marginBottom: 6 }}>Terms of Service</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginBottom: 30 }}>Last updated: July 2026</p>

        <Section title="1. About LocalBiz Discovery">
          LocalBiz Discovery is a directory platform that helps customers find local businesses across Pakistan, and helps business owners list and manage their business information, promotions, and customer reviews. This is a student Final Year Design Project (BSIT22-G3, GIOC Gujranwala) built for academic purposes.
        </Section>
        <Section title="2. Accounts">
          You must provide accurate information when creating an account. You are responsible for keeping your password secure. Business owners are responsible for the accuracy of the information they submit about their business.
        </Section>
        <Section title="3. Business Listings">
          All business listings are reviewed by an admin before appearing publicly. LocalBiz reserves the right to reject, suspend, or remove any listing that is fraudulent, inaccurate, or violates these terms.
        </Section>
        <Section title="4. Reviews">
          Reviews must reflect a genuine customer experience. Fake, abusive, or defamatory reviews may be removed. Business owners may not review their own business.
        </Section>
        <Section title="5. Reporting">
          Users can report listings or reviews that appear fraudulent or inappropriate. Reports are reviewed by an administrator, who may suspend the business or remove the review as appropriate.
        </Section>
        <Section title="6. Limitation of Liability">
          LocalBiz Discovery does not process payments, handle deliveries, or guarantee the quality of any listed business's products or services. Transactions between customers and businesses happen entirely outside this platform.
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
