import {
  Utensils, ShoppingBag, Wrench, Pill, GraduationCap,
  Scissors, Dumbbell, Car, Store,
} from 'lucide-react'

// Maps a business category string (free text, as stored in the DB / chosen
// from the category <select>) to a Lucide icon component. Falls back to a
// generic Store icon for anything unrecognised.
const MAP = [
  [/restaurant|dining|food|sweet/i, Utensils],
  [/retail|shop/i,                  ShoppingBag],
  [/service/i,                      Wrench],
  [/health|pharmacy|medical/i,      Pill],
  [/education|academy|coaching/i,   GraduationCap],
  [/beauty|salon|clipper|barber/i,  Scissors],
  [/fitness|gym/i,                  Dumbbell],
  [/auto|garage|car/i,              Car],
]

export function getCategoryIcon(category = '') {
  for (const [pattern, Icon] of MAP) {
    if (pattern.test(category)) return Icon
  }
  return Store
}

export function CategoryIcon({ category, size = 22, ...rest }) {
  const Icon = getCategoryIcon(category)
  return <Icon size={size} {...rest} />
}
