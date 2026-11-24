import { useEffect, useLayoutEffect, useRef, useState } from 'react'
const KEY = 'yaku-consent'
type C = { preferences: boolean; analytics: boolean; marketing: boolean }
/** Read before loading any non-essential script: only run analytics/marketing when getConsent()?.analytics / .marketing is true. */
export const getConsent = (): C | null => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
export default function CookieBanner({ onHeightChange }: { onHeightChange?: (height: number) => void }) {
  const [open, setOpen] = useState(() => !getConsent()); const [manage, setManage] = useState(false)
  const [c, setC] = useState<C>(getConsent() ?? { preferences: false, analytics: false, marketing: false })
  const banner = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = () => { setManage(true); setOpen(true) }; addEventListener('yaku:cookies', h); return () => removeEventListener('yaku:cookies', h) }, [])
  useLayoutEffect(() => {
    if (!open || !banner.current) { onHeightChange?.(0); return }
    const element = banner.current
    const update = () => onHeightChange?.(element.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update); observer.observe(element)
    return () => { observer.disconnect(); onHeightChange?.(0) }
  }, [open, manage, onHeightChange])
  const save = (v: C) => { try { localStorage.setItem(KEY, JSON.stringify({ ...v, at: new Date().toISOString() })) } catch { /* storage blocked */ } setC(v); setOpen(false); setManage(false) }
  if (!open) return null
  return <div ref={banner} className="cookie" role="dialog" aria-label="Cookie preferences">
    <p>We use essential cookies to run YAKU. With your permission we also use preference, analytics and marketing cookies. See the <a href="/info/cookies">Cookie Notice</a>.</p>
    {manage && <div className="ctog">
      <label><input type="checkbox" checked disabled /> Essential (always on)</label>
      {(['preferences', 'analytics', 'marketing'] as const).map(k => <label key={k}><input type="checkbox" checked={c[k]} onChange={e => setC({ ...c, [k]: e.target.checked })} /> {k[0].toUpperCase() + k.slice(1)}</label>)}
      <button className="btn" onClick={() => save(c)}>Save preferences</button></div>}
    <div className="cbtn"><button className="btn" onClick={() => save({ preferences: true, analytics: true, marketing: true })}>Accept All</button>
      <button className="btn ghost" onClick={() => save({ preferences: false, analytics: false, marketing: false })}>Reject Non-Essential</button>
      {!manage && <button className="btn ghost" onClick={() => setManage(true)}>Manage Preferences</button>}</div></div>
}
