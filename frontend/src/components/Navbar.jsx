import { Store, LogOut, LayoutDashboard, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useGo } from '../useGo.js'
import './Navbar.css'

export default function Navbar() {
  const { isLoggedIn, user } = useAuth()
  const go = useGo()

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => go('landing')}>
        <span className="nav-icon"><Store size={18} strokeWidth={2.4} /></span>
        <span className="nav-brand">LocalBiz</span>
      </div>
      <ul className="nav-links">
        <li><button onClick={() => go('search')}>Directory</button></li>

        {isLoggedIn && user?.user_type === 'customer' && (
          <li>
            <button onClick={() => go('profile')} className="hide-sm">
              <User size={15} style={{ verticalAlign: '-3px', marginRight: 4 }} />
              My Profile
            </button>
          </li>
        )}

        {isLoggedIn && user?.user_type === 'owner' && (
          <li>
            <button onClick={() => go('owner')} className="hide-sm">
              <LayoutDashboard size={15} style={{ verticalAlign: '-3px', marginRight: 4 }} />
              My Dashboard
            </button>
          </li>
        )}

        {isLoggedIn && user?.user_type === 'admin' && (
          <li>
            <button onClick={() => go('admin')} className="hide-sm">
              <LayoutDashboard size={15} style={{ verticalAlign: '-3px', marginRight: 4 }} />
              Admin Panel
            </button>
          </li>
        )}

        {isLoggedIn ? (
          <li>
            <button onClick={() => go('logout')}>
              <LogOut size={15} style={{ verticalAlign: '-3px', marginRight: 4 }} />
              Logout ({user?.full_name?.split(' ')[0]})
            </button>
          </li>
        ) : (
          <>
            <li><button onClick={() => go('login')}>Login</button></li>
            <li><button onClick={() => go('register')} className="nav-cta">Register Business</button></li>
          </>
        )}
      </ul>
    </nav>
  )
}
