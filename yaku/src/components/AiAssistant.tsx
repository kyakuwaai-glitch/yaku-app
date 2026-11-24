import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Chat from './Chat'
export default function AiAssistant({ cookieHeight = 0 }: { cookieHeight?: number }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const offsetStyle = { '--ai-cookie-offset': `${cookieHeight}px` } as CSSProperties
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onPointer = (e: PointerEvent) => { const target = e.target as Node; if (!panel.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false) }
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer) }
  }, [open])
  return <>
    {open && <div id="yaku-ai-panel" ref={panel} className="aipanel" style={offsetStyle} role="dialog" aria-labelledby="yaku-ai-title" tabIndex={-1}>
      <div className="aih"><b id="yaku-ai-title">YAKU AI</b><span><Link to="/studio/assistant" onClick={close}>Full page</Link> <button type="button" className="link" onClick={close} aria-label="Close assistant">✕</button></span></div>
      <Chat />
    </div>}
    <button ref={trigger} type="button" className="aibtn" style={offsetStyle} onClick={() => setOpen(!open)} aria-label={open ? 'Close YAKU AI assistant' : 'Open YAKU AI assistant'} aria-expanded={open} aria-controls="yaku-ai-panel">
      <svg className={open ? 'ai-close-icon' : undefined} viewBox="0 0 24 24" aria-hidden="true">{open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />}</svg>
      <span>{open ? 'Close' : 'Ask YAKU AI'}</span>
    </button>
  </>
}
