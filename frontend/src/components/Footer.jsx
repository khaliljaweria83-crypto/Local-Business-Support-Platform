import { Store } from 'lucide-react'
import { useGo } from '../useGo.js'
import './Footer.css'

export default function Footer() {
  const go = useGo()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <Store size={18} strokeWidth={2.4} style={{ verticalAlign: '-4px', marginRight: 6 }} />
            LocalBiz
          </div>
          <p>Empowering local businesses across Pakistan through digital innovation and community discovery.</p>
          <small>FYDP 2026 · GIOC Gujranwala · BSIT22-G3</small>
        </div>
        <div className="footer-col">
          <h4>Platform</h4>
          <button onClick={() => go('search')}>Browse Directory</button>
          <button onClick={() => go('register')}>List Your Business</button>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <button onClick={() => go('about')}>About Us</button>
          <button onClick={() => go('contact')}>Contact</button>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <button onClick={() => go('privacy')}>Privacy Policy</button>
          <button onClick={() => go('terms')}>Terms of Service</button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 LocalBiz Discovery. All rights reserved.</span>
      </div>
    </footer>
  )
}
