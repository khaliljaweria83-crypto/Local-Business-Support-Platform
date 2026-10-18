import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

// Wraps react-router's navigate() so existing page code can keep calling
// go('search', {...}) / go('detail', business) / go('logout') etc; this
// keeps the rewrite of every page small while still giving every page a
// real, bookmarkable, shareable URL (and working browser back/forward).
export function useGo() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (page, data = null) => {
    switch (page) {
      case 'landing':
        navigate('/')
        break
      case 'search': {
        const params = new URLSearchParams()
        if (data?.search) params.set('q', data.search)
        if (data?.category) params.set('category', data.category)
        const qs = params.toString()
        navigate(`/search${qs ? `?${qs}` : ''}`)
        break
      }
      case 'detail':
        navigate(`/business/${data?.id}`)
        break
      case 'login':
        navigate('/login')
        break
      case 'reset-password':
        navigate(`/reset-password${data?.token ? `?token=${data.token}` : ''}`)
        break
      case 'register':
        navigate('/register', data ? { state: data } : undefined)
        break
      case 'profile':
        navigate('/profile')
        break
      case 'owner':
        navigate('/owner')
        break
      case 'admin':
        navigate('/admin')
        break
      case 'terms':
        navigate('/terms')
        break
      case 'privacy':
        navigate('/privacy')
        break
      case 'about':
        navigate('/about')
        break
      case 'contact':
        navigate('/contact')
        break
      case 'logout':
        logout()
        navigate('/')
        break
      default:
        navigate('/')
    }
    window.scrollTo(0, 0)
  }
}
