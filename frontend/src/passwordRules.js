// ONE place for the password rule — used by the Register and Reset-Password
// pages. The backend (controllers/authController.js) enforces the same rule,
// so it can't be bypassed by skipping the website.
//
// A password is accepted only when it has ALL of these:
//   • at least 8 characters
//   • a letter (A-Z / a-z)
//   • a number (0-9)
//   • a special character from the list below
//   • no spaces  (a space used to be wrongly counted as a "special character")
export const SPECIAL_CHAR = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/

export const PASSWORD_CHECKS = [
  { label: 'At least 8 characters',                 test: (pw) => pw.length >= 8 },
  { label: 'A letter (A-Z or a-z)',                 test: (pw) => /[A-Za-z]/.test(pw) },
  { label: 'A number (0-9)',                        test: (pw) => /[0-9]/.test(pw) },
  { label: 'A special character, e.g. ! @ # $ % &', test: (pw) => SPECIAL_CHAR.test(pw) },
  { label: 'No spaces',                             test: (pw) => !/\s/.test(pw) },
]

export const isStrongPassword = (pw) =>
  typeof pw === 'string' && PASSWORD_CHECKS.every((c) => c.test(pw))

export const PASSWORD_HINT =
  'At least 8 characters with a letter, a number and a special character (no spaces)'
