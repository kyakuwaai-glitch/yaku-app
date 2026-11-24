import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useData, Err, Table, run, fmt, ugx, Row } from '../console/ui'
import { ZERO } from '../../lib/providers'
export default function MyRequests() {
  const { session } = useAuth(); const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const [sel, setSel] = useState('')
  const od = useData<Row[]>(() => supabase.from('service_orders').select('*,providers(business_name),provider_reviews(id)').eq('customer_id', session!.user.id).order('created_at', { ascending: false }), [n])
  const ev = useData<Row[]>(() => supabase.from('service_order_events').select('*').eq('order_id', sel || ZERO).order('created_at', { ascending: false }), [sel, n]); const o = od.data?.find(x => x.id === sel); const after = () => setN(x => x + 1)
  const act = (a: string, note?: string) => run(supabase.rpc('service_order_action', { p_order: sel, p_action: a, p_note: note ?? null }), setMsg, 'Updated.', after)
  const review = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('provider_reviews').insert({ order_id: sel, provider_id: o!.provider_id, customer_id: session!.user.id, rating: Number(f.get('rating')), comment: f.get('comment') || null }), setMsg, 'Thank you for your review.', after) }
  const complain = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('tickets').insert({ user_id: session!.user.id, category: 'provider_complaint', subject: `Complaint about ${o!.providers?.business_name} (order ${o!.order_no})`, description: String(f.get('why')) }), setMsg, 'Complaint sent to YAKU support.') }
  return <div className="sec"><Helmet><title>My service requests | YAKU</title><meta name="robots" content="noindex" /></Helmet><h1>My service requests</h1><p><Link to="/providers">Find more providers</Link></p><Err m={od.err || msg} />
    <Table rows={od.data} empty="You have not requested any services yet." cols={[['Request', r => <button className="link" onClick={() => setSel(r.id)}>{r.order_no}</button>], ['Provider', r => r.providers?.business_name], ['Status', r => r.status], ['Quote', r => r.quote_amount != null ? ugx(r.quote_amount) : 'Waiting'], ['Payment', r => r.payment_status], ['Sent', r => fmt(r.created_at)]]} />
    {o && <section className="card sub"><h3>{o.order_no} · {o.providers?.business_name}</h3><p>{o.details}</p>
      {o.status === 'quoted' && <div><p><b>Quotation: {ugx(o.quote_amount)}</b>{o.quote_days != null && ` · ${o.quote_days} day(s)`}<br />{o.quote_note}</p><div className="cbtn"><button className="btn" onClick={() => act('accept')}>Accept quote</button><button className="btn ghost" onClick={() => act('reject')}>Decline</button></div></div>}
      {['new', 'quoted', 'accepted'].includes(o.status) && <button className="btn ghost" onClick={() => act('cancel')}>Cancel request</button>}
      {o.status === 'accepted' && <p className="note">Payment is verified by YAKU before the job is counted as paid. Contact YAKU support to arrange payment.</p>}
      {o.status === 'completed' && !o.provider_reviews?.length && <form className="cbtn" onSubmit={review}><select name="rating" aria-label="Rating">{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>)}</select><input name="comment" placeholder="Your review" /><button className="btn">Leave review</button></form>}
      <form className="cbtn" onSubmit={complain}><input name="why" placeholder="Report a problem with this provider" required /><button className="btn ghost">Send complaint</button></form>
      <Table rows={ev.data} cols={[['When', r => fmt(r.created_at)], ['Status', r => r.status], ['Note', r => r.note ?? '']]} /></section>}</div>
}
