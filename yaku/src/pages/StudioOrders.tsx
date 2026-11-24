import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useData, Err, Table, run, fmt, ugx, Row } from './console/ui'
export default function StudioOrders() {
  const { session, staffRoles } = useAuth(); const [t, setT] = useState(0); const [msg, setMsg] = useState(''); const after = () => setT(x => x + 1)
  const pr = useData<Row[]>(() => session ? supabase.from('printing_requests').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }), [t, session?.user.id])
  const quote = (id: string, ok: boolean) => run(supabase.rpc('respond_quote', { p_id: id, p_approve: ok }), setMsg, ok ? 'Quotation approved.' : 'Quotation declined.', after)
  const art = (id: string) => run(supabase.rpc('approve_artwork', { p_request: id }), setMsg, 'Artwork approved.', after)
  if (!session) return <section className="form"><h1>Print Orders</h1><p className="empty"><Link to="/login">Sign in</Link> with your YAKU account to see your printing jobs.</p></section>
  return <div><h1>Print Orders</h1><p>Your printing jobs also appear in <Link to="/dashboard">My account</Link>. Production starts only after you approve the quote and artwork and YAKU verifies your payment.</p><Err m={pr.err || msg} />
    <Table rows={pr.data} empty="You have no printing requests yet." cols={[['Request', r => r.request_no], ['Item', r => `${r.product_type ?? ''} × ${r.quantity ?? '?'}`],
      ['Quote', r => r.quote_amount != null ? <>{ugx(r.quote_amount)} {r.quote_status === 'quoted' ? <span className="cbtn"><button className="btn" onClick={() => quote(r.id, true)}>Approve</button><button className="btn ghost" onClick={() => quote(r.id, false)}>Decline</button></span> : `(${r.quote_status})`}</> : 'Awaiting quote'],
      ['Artwork', r => !r.artwork_id ? '–' : r.artwork_approved ? 'Approved' : <button className="btn ghost" onClick={() => art(r.id)}>Approve artwork</button>], ['Payment', r => r.payment_status], ['Production', r => r.production_status], ['Delivery', r => r.delivery_status], ['Requested', r => fmt(r.created_at)]]} />
    {staffRoles.length > 0 && <p className="note">Staff: manage production, payment verification and quality control in the <Link to="/console">Business Console</Link>.</p>}</div>
}
