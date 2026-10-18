import { PASSWORD_CHECKS } from '../passwordRules.js'

// Live checklist shown under a password field: every requirement turns green
// (✓) once it is met and red (✗) while it is missing, so the person can see
// exactly what their password still needs.
export default function PasswordChecklist({ password }) {
  const started = password.length > 0
  return (
    <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, fontSize: '0.74rem', lineHeight: 1.6 }}>
      {PASSWORD_CHECKS.map((c) => {
        const ok = c.test(password)
        return (
          <li key={c.label} style={{ color: ok ? 'var(--green-main)' : started ? 'var(--red)' : 'var(--gray-400)' }}>
            {ok ? '✓' : started ? '✗' : '•'} {c.label}
          </li>
        )
      })}
    </ul>
  )
}
