import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, Info } from 'lucide-react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [modal, setModal] = useState(null)
  // modal shape: { message, kind: 'alert'|'confirm'|'prompt', resolve, placeholder, minLength, submitLabel }
  const [promptValue, setPromptValue] = useState('')

  const alert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ message, kind: 'alert', resolve })
    })
  }, [])

  const confirmDialog = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ message, kind: 'confirm', resolve })
    })
  }, [])

  // prompt(message, defaultValue, options) -> resolves to the typed text, or null if cancelled.
  // options (all optional): { minLength, placeholder, submitLabel }
  //   minLength   - Submit stays disabled until at least this many characters are typed
  //   placeholder - grey hint text inside the box
  //   submitLabel - text of the confirm button (default "Submit")
  const prompt = useCallback((message, defaultValue = '', options = {}) => {
    setPromptValue(defaultValue)
    return new Promise((resolve) => {
      setModal({ message, kind: 'prompt', resolve, ...options })
    })
  }, [])

  const close = (result) => {
    if (modal?.resolve) modal.resolve(result)
    setModal(null)
    setPromptValue('')
  }

  return (
    <UIContext.Provider value={{ alert, confirm: confirmDialog, prompt }}>
      {children}
      {modal && (
        <div style={overlayStyle} onClick={() => modal.kind !== 'prompt' && close(false)}>
          <div style={boxStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: modal.kind === 'confirm' ? '#e65100' : '#1e5c3a', flexShrink: 0 }}>
                {modal.kind === 'confirm' ? <AlertTriangle size={22} /> : <Info size={22} />}
              </span>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#333', lineHeight: 1.5, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{modal.message}</p>
            </div>
            {modal.kind === 'prompt' && (
              <textarea
                autoFocus
                value={promptValue}
                placeholder={modal.placeholder || ''}
                maxLength={500}
                onChange={e => setPromptValue(e.target.value)}
                style={{ width: '100%', marginTop: 14, minHeight: 70, borderRadius: 8, border: '1.5px solid #ddd', padding: 10, fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            )}
            {modal.kind === 'prompt' && modal.minLength > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: promptValue.trim().length < modal.minLength ? '#c62828' : '#6b7c72' }}>
                {promptValue.trim().length < modal.minLength
                  ? `Please write at least ${modal.minLength} characters (${promptValue.trim().length}/${modal.minLength}).`
                  : `${promptValue.trim().length}/500`}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              {modal.kind !== 'alert' && (
                <button onClick={() => close(modal.kind === 'prompt' ? null : false)} style={btnOutline}>Cancel</button>
              )}
              <button
                onClick={() => close(modal.kind === 'prompt' ? promptValue.trim() : true)}
                disabled={modal.kind === 'prompt' && promptValue.trim().length < (modal.minLength || 0)}
                style={{
                  ...btnPrimary,
                  ...(modal.kind === 'prompt' && promptValue.trim().length < (modal.minLength || 0)
                    ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                }}
              >
                {modal.kind === 'confirm' ? 'Confirm' : modal.kind === 'prompt' ? (modal.submitLabel || 'Submit') : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  )
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(20,30,25,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
}
const boxStyle = {
  background: 'white', borderRadius: 14, padding: '22px 24px', maxWidth: 420, width: '90%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
}
const btnPrimary = {
  background: '#1e5c3a', color: 'white', border: 'none', borderRadius: 8,
  padding: '9px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
}
const btnOutline = {
  background: 'white', color: '#555', border: '1.5px solid #ddd', borderRadius: 8,
  padding: '9px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>')
  return ctx
}
