// ============================================
// Pakistani phone number auto-formatter
// ============================================
// Formats digits as the user types into "0300 1234567" —
// a 4-digit prefix, a space, then the remaining digits.
// Used by every phone <input> in the app so typing "0300"
// followed by more digits automatically gets the space
// inserted after the prefix instead of the raw digit string.
//
// Any non-digit characters the user types (spaces, dashes,
// letters) are stripped out first, so pasting a number in any
// format still comes out normalized. Capped at 11 digits,
// which is the standard length of a Pakistani mobile number
// (0300 1234567 = 11 digits).

export function formatPkPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} ${digits.slice(4)}`
}
