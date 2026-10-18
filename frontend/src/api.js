// ============================================
// Central API helper
// Every network call the frontend makes to the
// Express backend goes through this one file.
// ============================================

// The backend address. Defaults to localhost:5000; to point at another
// machine, set VITE_SERVER_URL in frontend/.env (e.g. VITE_SERVER_URL=http://192.168.1.5:5000)
export const SERVER_ORIGIN = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
export const API_BASE = `${SERVER_ORIGIN}/api`

function getToken() {
  return localStorage.getItem('localbiz_token')
}

// Messages that specifically mean "this session itself is no longer valid"
// (token missing/expired, or the account was blocked after login) — as
// opposed to an ordinary business-rule 403 like "You cannot review your own
// business", which is about the action, not the session, and should just be
// shown as a normal error instead of logging the person out.
const SESSION_INVALID_MESSAGES = new Set([
  'Access denied. No token provided.',
  'Invalid or expired token.',
  'Your account has been blocked.',
  'Account no longer exists.',
])

function clearSessionAndRedirect() {
  localStorage.removeItem('localbiz_token')
  localStorage.removeItem('localbiz_user')
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    // Network-level failure (backend not running, CORS, etc.)
    throw new Error('Cannot reach the server. Please make sure the backend is running.')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    /* no JSON body (e.g. 204) */
  }

  // Session no longer valid (expired token, or blocked while logged in) —
  // clear it and send the person back to Login instead of leaving them
  // stuck looking at a dashboard full of confusing "Invalid token" errors.
  if (auth && (res.status === 401 || res.status === 403) && data && SESSION_INVALID_MESSAGES.has(data.message)) {
    clearSessionAndRedirect()
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`)
  }

  return data
}

// ── AUTH ──
export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login:    (payload) => request('/auth/login',    { method: 'POST', body: payload }),
  profile:  () => request('/auth/profile', { auth: true }),
  updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: payload, auth: true }),
  sendRegistrationOtp: (email) => request('/auth/send-registration-otp', { method: 'POST', body: { email } }),
  verifyOtp: (email, otp, purpose) => request('/auth/verify-otp', { method: 'POST', body: { email, otp, purpose } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, newPassword) => request('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
}

// ── BUSINESSES ──
export const businessApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    ).toString()
    return request(`/businesses${qs ? `?${qs}` : ''}`)
  },
  // auth: true so the owner / admin get the full details of a non-public listing
  getById: (id) => request(`/businesses/${id}`, { auth: true }),
  getMine: () => request('/businesses/my', { auth: true }),
  create: (payload) => request('/businesses', { method: 'POST', body: payload, auth: true }),
  update: (id, payload) => request(`/businesses/${id}`, { method: 'PUT', body: payload, auth: true }),
  remove: (id) => request(`/businesses/${id}`, { method: 'DELETE', auth: true }),
  report: (id, reason) => request(`/businesses/${id}/report`, { method: 'POST', body: { reason }, auth: true }),
  uploadPhoto: async (id, file) => {
    const formData = new FormData()
    formData.append('photo', file)
    const token = getToken()
    const res = await fetch(`${API_BASE}/businesses/${id}/photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error((data && data.message) || 'Photo upload failed.')
    return data
  },
}

// ── REVIEWS ──
export const reviewApi = {
  getForBusiness: (businessId) => request(`/reviews/${businessId}`),
  add: (businessId, payload) => request(`/reviews/${businessId}`, { method: 'POST', body: payload, auth: true }),
  remove: (id) => request(`/reviews/${id}`, { method: 'DELETE', auth: true }),
  report: (id, reason) => request(`/reviews/${id}/report`, { method: 'POST', body: { reason }, auth: true }),
}

// ── PROMOTIONS ──
export const promotionApi = {
  getForBusiness: (businessId) => request(`/promotions/business/${businessId}`),
  getMine: () => request('/promotions/mine', { auth: true }),
  add: (payload) => request('/promotions', { method: 'POST', body: payload, auth: true }),
  remove: (id) => request(`/promotions/${id}`, { method: 'DELETE', auth: true }),
}

// ── ADMIN ──
export const adminApi = {
  stats:            () => request('/admin/stats', { auth: true }),
  allBusinesses:    () => request('/admin/businesses', { auth: true }),
  pendingBusinesses:() => request('/admin/businesses/pending', { auth: true }),
  approveBusiness:  (id, note) => request(`/admin/businesses/${id}/approve`, { method: 'POST', body: { note }, auth: true }),
  rejectBusiness:   (id, reason) => request(`/admin/businesses/${id}/reject`, { method: 'POST', body: { reason }, auth: true }),
  suspendBusiness:  (id, reason) => request(`/admin/businesses/${id}/suspend`, { method: 'POST', body: { reason }, auth: true }),
  allUsers:         () => request('/admin/users', { auth: true }),
  blockUser:        (id) => request(`/admin/users/${id}/block`, { method: 'POST', auth: true }),
  unblockUser:      (id) => request(`/admin/users/${id}/unblock`, { method: 'POST', auth: true }),
  allReports:       () => request('/admin/reports', { auth: true }),
  dismissReport:    (id, response) => request(`/admin/reports/${id}/dismiss`, { method: 'POST', body: { response }, auth: true }),
  resolveReport:    (id, response) => request(`/admin/reports/${id}/resolve`, { method: 'POST', body: { response }, auth: true }),
  logs:             () => request('/admin/logs', { auth: true }),
}

// Reports the logged-in user filed, including the admin's decision + explanation
export const reportApi = {
  mine: () => request('/reports/mine', { auth: true }),
}
