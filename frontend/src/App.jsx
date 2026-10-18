import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { UIProvider } from './context/UIContext.jsx'
import LandingPage    from './pages/LandingPage.jsx'
import LoginPage      from './pages/LoginPage.jsx'
import RegisterPage   from './pages/RegisterPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import SearchPage     from './pages/SearchPage.jsx'
import DetailPage     from './pages/DetailPage.jsx'
import OwnerDash      from './pages/OwnerDash.jsx'
import AdminDash      from './pages/AdminDash.jsx'
import TermsPage      from './pages/TermsPage.jsx'
import PrivacyPage    from './pages/PrivacyPage.jsx'
import ProfilePage    from './pages/ProfilePage.jsx'
import AboutPage      from './pages/AboutPage.jsx'
import ContactPage    from './pages/ContactPage.jsx'

// Guards a route so only a logged-in Business Owner can see it.
// Uses <Navigate> (declarative, evaluated at render time against the
// current AuthContext state) instead of an imperative check inside a
// shared nav function — this avoids the race condition where a guard
// reads a stale "not logged in yet" value right after a successful login.
function OwnerRoute({ children }) {
  const { isLoggedIn, user } = useAuth()
  if (!isLoggedIn || user?.user_type !== 'owner') {
    return <Navigate to="/login" state={{ reason: 'owner' }} replace />
  }
  return children
}

// Any logged-in user (customer, owner, or admin) can view their own profile.
function LoggedInRoute({ children }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AdminRoute({ children }) {
  const { isLoggedIn, user } = useAuth()
  if (!isLoggedIn || user?.user_type !== 'admin') {
    return <Navigate to="/login" state={{ reason: 'admin' }} replace />
  }
  return children
}

// Keeps an already-logged-in person from landing back on Login/Register.
function PublicOnlyRoute({ children }) {
  const { isLoggedIn, user } = useAuth()
  if (isLoggedIn) {
    const home = user?.user_type === 'admin' ? '/admin' : user?.user_type === 'owner' ? '/owner' : '/'
    return <Navigate to={home} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/business/:id" element={<DetailPage />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/profile" element={<LoggedInRoute><ProfilePage /></LoggedInRoute>} />
      <Route path="/owner" element={<OwnerRoute><OwnerDash /></OwnerRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDash /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <AppRoutes />
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
