import { useState, lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../auth/AuthContext'
import { sections, canSee } from '../lib/perms'
const mods: Record<string, ReturnType<typeof lazy>> = {
  overview: lazy(() => import('./console/Overview')), storefront: lazy(() => import('./console/Storefront')), orders: lazy(() => import('./console/Orders')), inventory: lazy(() => import('./console/Inventory')),
  vendors: lazy(() => import('./console/Vendors')), printing: lazy(() => import('./console/Printing')), finance: lazy(() => import('./console/Finance')),
  support: lazy(() => import('./console/Support')), reports: lazy(() => import('./console/Reports')), pricing: lazy(() => import('./console/Pricing')), ai: lazy(() => import('./console/AiAssistant')), providers: lazy(() => import('./console/ProviderAdmin')), alerts: lazy(() => import('./console/Alerts')), staff: lazy(() => import('./console/Staff')),
}
export default function Console() {
  const { session, loading, staffRoles, staffReady } = useAuth(); const visible = sections.filter(s => canSee(staffRoles, s.key)); const [k, setK] = useState('')
  if (loading) return <p className="pad">Loading…</p>
  if (!session) return <Navigate to="/staff-login" replace />
  if (!staffReady) return <p className="pad">Loading…</p>
  if (!visible.length) return <Navigate to="/404" replace />
  const cur = visible.find(s => s.key === k) ?? visible[0]; const M = mods[cur.key]
  return <div className="cons"><Helmet><title>Business console | YAKU</title><meta name="robots" content="noindex" /></Helmet>
    <nav className="cnav noprint" aria-label="Console sections">{visible.map(s => <button key={s.key} className={s.key === cur.key ? 'on' : ''} onClick={() => setK(s.key)}>{s.label}</button>)}</nav>
    <section className="cmain"><h1>{cur.label}</h1><Suspense fallback={<p>Loading…</p>}><M key={cur.key} /></Suspense></section></div>
}
