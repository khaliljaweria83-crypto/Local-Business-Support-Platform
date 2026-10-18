// Single source of truth for business categories.
// Used by RegisterPage + OwnerDash (when an owner picks a category for their
// business) AND by SearchPage/LandingPage (when a customer filters by
// category). Previously these were two different hardcoded lists that didn't
// match — e.g. Search offered "Food"/"Fine Dining" while registration only
// ever saved "Restaurant", so that filter could never match a real business.
export const CATEGORIES = [
  'Restaurant',
  'Retail',
  'Health',
  'Beauty',
  'Education',
  'Services',
  'Auto',
  'Fitness',
  'Other',
]
