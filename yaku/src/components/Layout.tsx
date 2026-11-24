import { ReactNode, useState, FormEvent } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useDepartments } from '../lib/storefront'
import { StripBanner } from './StoreBanners'
import { useAuth } from '../auth/AuthContext'
import { footerColumns } from '../content/pages'
import { useSettings } from '../lib/cms'
import CookieBanner from './CookieBanner'
import AiAssistant from './AiAssistant'
export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false); const [cookieHeight, setCookieHeight] = useState(0); const nav = useNavigate(); const { session, profile, staffRoles, signOut } = useAuth()
  const { pathname } = useLocation(); const close = () => setOpen(false); const st = useSettings(); const departments = useDepartments()
  const search = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('q') ?? '').trim(); if (q) nav(`/search?q=${encodeURIComponent(q)}`) }
  return <>
    <StripBanner />
    <header className="hdr">
      <div className="top">
        <button className="ico" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
        <Link to="/" className="logo"><img src="/logo.webp" alt="YAKU – order we print" width="210" height="39" /></Link>
        <form className="search" role="search" onSubmit={search}><input name="q" aria-label="Search products and services" placeholder="Search products and services" /><button>Search</button></form>
        <nav className="acts">
          {session ? <>{staffRoles.length > 0 && <Link to="/console">Console</Link>}<Link to="/dashboard">{profile?.full_name?.split(' ')[0] ?? 'Account'}</Link><button className="link" onClick={signOut}>Logout</button></> : <><Link to="/login">Sign in</Link><Link to="/register">Register</Link></>}
          <Link to="/wishlist" aria-label="Wishlist">♡</Link><Link to="/cart" aria-label="Cart">🛒</Link>
        </nav>
      </div>
      <nav className="depts" aria-label="Departments"><NavLink className="studio-link" to="/studio">YAKU STUDIO</NavLink>{departments.map(d => <NavLink key={d.slug} to={`/department/${d.slug}`}>{d.name}</NavLink>)}<NavLink to="/providers">Service Providers</NavLink></nav>
    </header>
    {open && <div className="drawer" onClick={close}><aside onClick={e => e.stopPropagation()}>
      <button className="ico" aria-label="Close menu" onClick={close}>✕</button>
      <h3>Departments</h3>{departments.map(d => <Link key={d.slug} to={`/department/${d.slug}`} onClick={close}>{d.name}</Link>)}
      <h3>Account</h3>{session ? <><Link to="/dashboard" onClick={close}>My dashboard</Link><Link to="/account" onClick={close}>Profile</Link></> : <><Link to="/login" onClick={close}>Sign in</Link><Link to="/register" onClick={close}>Register</Link></>}
      <Link to="/studio" onClick={close}><b>YAKU STUDIO</b></Link><Link to="/providers" onClick={close}>Service Providers</Link><Link to="/info/sell" onClick={close}>Sell on Yaku</Link><Link to="/info/help" onClick={close}>Help Center</Link>
    </aside></div>}
    <main>{children}</main>
    {pathname !== '/studio/assistant' && <AiAssistant cookieHeight={cookieHeight} />}<CookieBanner onHeightChange={setCookieHeight} />
    <footer className="ftr"><div className="cols">
      <div><img src="/logo-footer.webp" alt="YAKU – order we print" width="180" height="84" className="flogo" /></div>
      {footerColumns.map(([h, ls]) => <div key={h}><h4>{h}</h4>{ls.map(([t, sl]) => <Link key={t} to={`/info/${sl}`}>{t}</Link>)}</div>)}
      <div><h4>Contact Information</h4><p>{st.business_name}{st.address && <><br />{st.address}</>}{st.phone && <><br /><a href={`tel:${st.phone.replace(/\s/g, '')}`}>{st.phone}</a></>}{st.email && <><br /><a href={`mailto:${st.email}`}>{st.email}</a></>}</p>
        {([['Facebook', st.facebook], ['Instagram', st.instagram], ['X', st.x]] as const).filter(x => x[1]).map(([n, u]) => <a key={n} href={u} rel="noopener noreferrer" target="_blank">{n}</a>)}
        <button className="link" onClick={() => dispatchEvent(new Event('yaku:cookies'))}>Cookie preferences</button></div>
    </div><p className="copy">© {new Date().getFullYear()} YAKU Uganda</p></footer>
  </>
}
