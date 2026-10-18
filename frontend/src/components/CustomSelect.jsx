import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

// A styled dropdown that always opens BELOW the field, regardless of where
// it sits on the page. Native <select> menus are positioned by the browser
// itself (it flips the list upward when there isn't enough room below), and
// that can't be overridden with CSS — so for any dropdown where we want
// guaranteed downward opening, we render our own list instead of relying on
// the native one.
//
// `options` accepts either an array of strings (e.g. CATEGORIES, CITIES) or
// an array of { value, label } objects (e.g. a list of businesses).
export default function CustomSelect({ value, onChange, options, placeholder = 'Select...', className = '' }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const normalized = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
  const selected = normalized.find(o => o.value === value)

  return (
    <div className="custom-select" ref={boxRef}>
      <button
        type="button"
        className={`custom-select-trigger ${className} ${!selected ? 'is-placeholder' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`custom-select-arrow ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="custom-select-menu">
          {normalized.map(o => (
            <div
              key={o.value}
              className={`custom-select-option ${o.value === value ? 'is-active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
