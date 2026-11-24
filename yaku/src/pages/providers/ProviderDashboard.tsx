import { useEffect, useState, FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useData, Err, Table, Stat, run, fmt, ugx, Row } from '../console/ui'
import ProviderProfileForm from '../../components/ProviderProfileForm'
import { mediaUrl, uploadImage, slugify, priceText, ZERO } from '../../lib/providers'
const TABS = ['Profile', 'Services', 'Portfolio', 'Requests & jobs', 'Reviews', 'Earnings']
export default function ProviderDashboard() {
  const { session } = useAuth(); const uid = session!.user.id; const [p, setP] = useState<Row | null | undefined>(undefined); const [n, setN] = useState(0); const [tab, setTab] = useState(TABS[0])
  useEffect(() => { Promise.resolve(supabase.from('providers').select('*').eq('owner_id', uid).maybeSingle()).then(({ data }) => setP(data)) }, [uid, n])
  if (p === undefined) return <p className="pad">Loading…</p>; if (p === null) return <Navigate to="/providers/join" replace />
  return <div className="sec"><Helmet><title>Provider dashboard | YAKU</title><meta name="robots" content="noindex" /></Helmet><h1>{p.business_name}</h1>
    <p className="msg">Status: <b>{p.status}</b>{p.verified && ' · ✔ verified'}. {p.status === 'pending' && 'YAKU is reviewing your profile. You can add services now; they go public once you are approved.'}{p.status === 'suspended' && 'Your listing is hidden. Contact YAKU support.'} <Link to={`/providers/${p.id}`}>View public profile</Link></p>
    <div className="tabs">{TABS.map(t => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Profile' && <ProviderProfileForm provider={p} uid={uid} onSaved={() => setN(x => x + 1)} />}{tab === 'Services' && <Services p={p} uid={uid} />}{tab === 'Portfolio' && <Portfolio p={p} uid={uid} />}
    {tab === 'Requests & jobs' && <Requests p={p} />}{tab === 'Reviews' && <Reviews p={p} />}{tab === 'Earnings' && <Earnings p={p} />}</div>
}
function Services({ p, uid }: { p: Row; uid: string }) {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const [other, setOther] = useState(false)
  const cats = useData<Row[]>(() => supabase.from('service_categories').select('id,name,status').neq('status', 'rejected').order('name'), [n])
  const sv = useData<Row[]>(() => supabase.from('provider_services').select('*,service_categories(name)').eq('provider_id', p.id).order('created_at', { ascending: false }), [n])
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); let category_id: any = f.get('cat') || null; let custom_name: string | null = null
    if (category_id === 'other') { const name = String(f.get('newcat') ?? '').trim(); if (!name) return setMsg('Name the new service type.')
      const { data, error } = await supabase.from('service_categories').insert({ slug: slugify(name), name, status: 'pending', requested_by: uid }).select('id').single(); if (error) return setMsg(error.message); category_id = data.id; custom_name = name }
    const photos: string[] = []; for (const file of (f.getAll('photos') as File[]).filter(x => x.size > 0).slice(0, 4)) { const r = await uploadImage(uid, file); if (r.error) return setMsg(r.error); photos.push(r.path!) }
    const price = f.get('price'), days = f.get('days')
    const { error } = await supabase.from('provider_services').insert({ provider_id: p.id, category_id, custom_name, title: String(f.get('title')).trim(), description: f.get('desc') || null, price_type: f.get('ptype'), price_from_ugx: price === '' ? null : Number(price), min_qty: Number(f.get('min') || 1), production_days: days === '' ? null : Number(days), available: f.get('avail') === 'on', photos })
    if (error) return setMsg(error.message); setMsg('Service saved. It goes public once approved.'); form.reset(); setOther(false); setN(x => x + 1) }
  return <div><Err m={msg} /><form className="sform" onSubmit={add}><h3>Add a service</h3>
    <label>Service type<select name="cat" required onChange={e => setOther(e.target.value === 'other')}><option value="">Choose…</option>{(cats.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'pending' ? ' (awaiting approval)' : ''}</option>)}<option value="other">Other (suggest a new type)</option></select></label>
    {other && <label>Name of the new service type<input name="newcat" maxLength={60} /></label>}<label>Service title<input name="title" required /></label><label>Description<textarea name="desc" rows={3} /></label>
    <div className="cbtn"><label>Pricing<select name="ptype"><option value="quote">Quote on request</option><option value="from">From (starting price)</option><option value="fixed">Fixed price</option></select></label><label>Price UGX<input name="price" type="number" min="0" /></label><label>Minimum quantity<input name="min" type="number" min="1" defaultValue="1" /></label><label>Production days<input name="days" type="number" min="0" /></label></div>
    <label>Photos (up to 4, under 5 MB each)<input name="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple /></label><label><input name="avail" type="checkbox" defaultChecked /> Available now</label><button className="btn">Save service</button></form>
    <Table rows={sv.data} empty="No services yet." cols={[['Service', r => r.title], ['Type', r => r.service_categories?.name ?? r.custom_name], ['Price', r => priceText(r.price_type, r.price_from_ugx)], ['Min', r => r.min_qty], ['Days', r => r.production_days ?? '–'], ['Review', r => r.status],
      ['Available', r => <button className="link" onClick={() => run(supabase.from('provider_services').update({ available: !r.available }).eq('id', r.id), setMsg, 'Updated.', () => setN(x => x + 1))}>{r.available ? 'Yes (turn off)' : 'No (turn on)'}</button>]]} /></div>
}
function Portfolio({ p, uid }: { p: Row; uid: string }) {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const pf = useData<Row[]>(() => supabase.from('provider_portfolio').select('*').eq('provider_id', p.id).order('created_at', { ascending: false }), [n])
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const file = f.get('img') as File; if (!file || !file.size) return setMsg('Choose an image.')
    const r = await uploadImage(uid, file); if (r.error) return setMsg(r.error); const { error } = await supabase.from('provider_portfolio').insert({ provider_id: p.id, image_path: r.path, caption: f.get('cap') || null }); if (error) return setMsg(error.message); form.reset(); setN(x => x + 1) }
  async function del(x: Row) { await supabase.storage.from('provider-media').remove([x.image_path]); run(supabase.from('provider_portfolio').delete().eq('id', x.id), setMsg, 'Removed.', () => setN(v => v + 1)) }
  return <div><Err m={msg} /><form className="cbtn" onSubmit={add}><input name="img" type="file" accept="image/png,image/jpeg,image/webp" /><input name="cap" placeholder="Caption" /><button className="btn">Add to portfolio</button></form>
    {pf.data?.length === 0 && <p className="empty">Your portfolio is empty. Show customers examples of your work.</p>}<div className="grid">{(pf.data ?? []).map(x => <figure key={x.id} style={{ margin: 0 }}><img src={mediaUrl(x.image_path)} alt={x.caption ?? ''} style={{ width: '100%' }} /><figcaption className="note">{x.caption} <button className="link" onClick={() => del(x)}>Remove</button></figcaption></figure>)}</div></div>
}
function Requests({ p }: { p: Row }) {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const [sel, setSel] = useState('')
  const od = useData<Row[]>(() => supabase.from('service_orders').select('*,provider_services(title)').eq('provider_id', p.id).order('created_at', { ascending: false }), [n])
  const ev = useData<Row[]>(() => supabase.from('service_order_events').select('*').eq('order_id', sel || ZERO).order('created_at', { ascending: false }), [sel, n]); const o = od.data?.find(x => x.id === sel)
  const act = (action: string, extra: Row = {}) => run(supabase.rpc('service_order_action', { p_order: sel, p_action: action, ...extra }), setMsg, 'Updated.', () => setN(x => x + 1))
  const quote = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); act('quote', { p_amount: Number(f.get('amt')), p_days: f.get('days') ? Number(f.get('days')) : null, p_note: f.get('note') || null }) }
  const note = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; act('note', { p_note: new FormData(form).get('note') }); form.reset() }
  return <div><Err m={od.err || msg} /><Table rows={od.data} empty="No requests yet. Customers who request a quote from your profile appear here." cols={[['Request', r => <button className="link" onClick={() => setSel(r.id)}>{r.order_no}</button>], ['Customer', r => r.customer_name], ['Service', r => r.provider_services?.title ?? 'General'], ['Status', r => r.status], ['Quote', r => r.quote_amount != null ? ugx(r.quote_amount) : '–'], ['Payment', r => r.payment_status], ['Received', r => fmt(r.created_at)]]} />
    {o && <section className="card sub"><h3>{o.order_no}</h3><p>{o.customer_name} · {o.contact_phone ?? 'no phone given'} · qty {o.quantity ?? '–'} · needed by {o.needed_by ?? '–'}</p><p>{o.details}</p>
      {['new', 'quoted'].includes(o.status) && <form className="cbtn" onSubmit={quote}><input name="amt" type="number" min="0" placeholder="Quote UGX" required defaultValue={o.quote_amount ?? ''} /><input name="days" type="number" min="0" placeholder="Days" defaultValue={o.quote_days ?? ''} /><input name="note" placeholder="Note to customer" /><button className="btn">{o.status === 'quoted' ? 'Update quote' : 'Send quote'}</button><button type="button" className="btn ghost" onClick={() => act('decline')}>Decline</button></form>}
      <div className="cbtn">{o.status === 'accepted' && <button className="btn" onClick={() => act('start')}>Start job</button>}{['accepted', 'in_progress'].includes(o.status) && <button className="btn" onClick={() => act('complete')}>Mark completed</button>}</div>
      {o.status === 'accepted' && <p className="note">The customer accepted your quote. YAKU verifies payment before your earnings count.</p>}
      <form className="cbtn" onSubmit={note}><input name="note" placeholder="Add a progress note" required /><button className="btn ghost">Add note</button></form>
      <Table rows={ev.data} cols={[['When', r => fmt(r.created_at)], ['Status', r => r.status], ['Note', r => r.note ?? '']]} /></section>}</div>
}
function Reviews({ p }: { p: Row }) { const rv = useData<Row[]>(() => supabase.from('provider_reviews').select('*').eq('provider_id', p.id).order('created_at', { ascending: false })); return <Table rows={rv.data} empty="No reviews yet." cols={[['Rating', r => '★'.repeat(r.rating)], ['Comment', r => r.comment ?? ''], ['Date', r => fmt(r.created_at)]]} /> }
function Earnings({ p }: { p: Row }) {
  const rp = useData<Row[]>(() => supabase.rpc('provider_report', { p_provider: p.id })); const st = useData<Row[]>(() => supabase.from('provider_settlements').select('*').eq('provider_id', p.id).order('paid_at', { ascending: false })); const r = rp.data?.[0]
  return <div><Err m={rp.err} />{r && <div className="stats"><Stat l="Completed, payment-verified sales" v={ugx(r.gross)} /><Stat l="YAKU commission" v={ugx(r.commission)} /><Stat l="Refunds" v={ugx(r.refunds)} /><Stat l="Your earnings" v={ugx(r.earnings)} /><Stat l="Settled to you" v={ugx(r.settled)} /><Stat l="Balance owed to you" v={ugx(r.balance)} /></div>}
    <p className="note">Only completed jobs whose payment YAKU has verified are counted.</p><h3>Settlements</h3><Table rows={st.data} empty="No settlements yet." cols={[['Date', x => fmt(x.paid_at)], ['Amount', x => ugx(x.amount)], ['Reference', x => x.reference]]} /></div>
}
