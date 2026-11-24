import { useEffect, useState } from 'react'
/** Opening animation: shown once per browser session, skipped for reduced-motion users, tap to skip. */
export default function Splash() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem('yaku-splash') && !matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
  })
  useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem('yaku-splash', '1') } catch { /* storage unavailable */ }
    const t = setTimeout(() => setShow(false), 3000)
    return () => clearTimeout(t)
  }, [show])
  if (!show) return null
  return (
    <div className="splash" aria-hidden="true" onClick={() => setShow(false)}>
      <div className="sl">
        <span className="ring" />
        <img src="/logo-splash.webp" alt="" width="720" height="337" />
      </div>
    </div>
  )
}
