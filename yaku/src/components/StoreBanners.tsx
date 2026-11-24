import { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBanners, bannerImg, Banner } from '../lib/storefront'
const safe = (u?: string | null) => (u && /^(\/|https:\/\/)/.test(u) ? u : null)   // never javascript: or http:
function Go({ b, className, children }: { b: Banner; className?: string; children: ReactNode }) {
  const u = safe(b.link_url); const click = () => { void supabase.rpc('banner_click', { p_id: b.id }) }
  if (!u) return <div className={className}>{children}</div>
  return u.startsWith('/') ? <Link to={u} className={className} onClick={click}>{children}</Link> : <a href={u} className={className} onClick={click} target="_blank" rel="noopener noreferrer sponsored">{children}</a>
}
export function StripBanner() {
  const b = useBanners('strip')[0]; const [hide, setHide] = useState(false); if (!b || hide) return null
  return <div className="strip"><Go b={b}><span>{b.title}</span>{b.button_text && <b> {b.button_text} →</b>}</Go><button className="link" onClick={() => setHide(true)} aria-label="Dismiss announcement">✕</button></div>
}
export function HeroBanner({ fallback }: { fallback: ReactNode }) {
  const list = useBanners('hero'); const [i, setI] = useState(0)
  useEffect(() => { if (list.length < 2) return; const t = setInterval(() => setI(x => (x + 1) % list.length), 6000); return () => clearInterval(t) }, [list.length])
  const b = list[i % Math.max(list.length, 1)]; if (!b) return <>{fallback}</>
  return <section className="hero hbanner" style={b.image_path ? { backgroundImage: `linear-gradient(90deg,#26336Fdd,#172A4399),url(${bannerImg(b.image_path)})` } : undefined}><div><h1>{b.title}</h1>{b.subtitle && <p>{b.subtitle}</p>}{safe(b.link_url) && <Go b={b} className="btn">{b.button_text || 'Learn more'}</Go>}</div></section>
}
export function PromoBanners({ fallback }: { fallback: ReactNode }) {
  const list = useBanners('promo'); if (!list.length) return <>{fallback}</>
  return <section className="sec promos">{list.map(b => <Go key={b.id} b={b} className="pbanner">{b.image_path && <img src={bannerImg(b.image_path)} alt="" loading="lazy" />}<span><b>{b.title}</b>{b.subtitle && <small>{b.subtitle}</small>}</span></Go>)}</section>
}
/** Paid or promotional slot. Always labelled "Ad". */
export function AdSlot({ placement }: { placement: 'home' | 'department' }) {
  const b = useBanners(placement)[0]; if (!b) return null
  return <aside className="sec ad" aria-label="Advertisement"><small className="adl">Ad</small><Go b={b} className="adbox">{b.image_path && <img src={bannerImg(b.image_path)} alt={b.title} loading="lazy" />}<span><b>{b.title}</b>{b.subtitle && <small>{b.subtitle}</small>}</span></Go></aside>
}
