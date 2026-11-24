import { useState, useEffect, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { useData, Err, fmt, Row } from '../console/ui'
import { mediaUrl, priceText } from '../../lib/providers'
import ReportButton from '../../components/ReportButton'
export default function ProviderProfile() {
  const { id = '' } = useParams(); const { session } = useAuth(); const [msg, setMsg] = useState(''); const [done, setDone] = useState('')
  const [pr, setPr] = useState<Row | null | undefined>(undefined)
  useEffect(() => { setPr(undefined); Promise.resolve(supabase.from('providers').select('*').eq('id', id).eq('status', 'approved').maybeSingle()).then(({ data }) => setPr(data)) }, [id])
  const sv = useData<Row[]>(() => supabase.from('provider_services').select('*,service_categories(name)').eq('provider_id', id).eq('status', 'approved'), [id])
  const pf = useData<Row[]>(() => supabase.from('provider_portfolio').select('*').eq('provider_id', id).order('created_at', { ascending: false }), [id])
  const rv = useData<Row[]>(() => supabase.from('provider_reviews').select('rating,comment,created_at').eq('provider_id', id).order('created_at', { ascending: false }).limit(20), [id])
  async function request(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); setMsg('')
    const { data, error } = await supabase.rpc('request_service', { p_provider: id, p_service: f.get('service') || null, p_details: f.get('details'), p_qty: f.get('qty') ? Number(f.get('qty')) : null, p_needed: f.get('needed') || null, p_phone: f.get('phone') || null })
    if (error) return setMsg(error.message); setDone(data as string) }
  if (pr === undefined) return <p className="pad">Loading…</p>
  if (!pr) return <section className="form"><h1>Provider not found</h1><p>This provider is not listed.</p><Link className="btn" to="/providers">Find providers</Link></section>
  const avg = rv.data?.length ? (rv.data.reduce((a, r) => a + r.rating, 0) / rv.data.length).toFixed(1) : null
  return <div className="sec"><Helmet><title>{pr.business_name} | YAKU Service Providers</title><meta name="description" content={(pr.description ?? `${pr.business_name} on YAKU`).slice(0, 155)} /></Helmet>
    <nav className="crumbs"><Link to="/">Home</Link> / <Link to="/providers">Service Providers</Link> / {pr.business_name}</nav>
    <div className="cbtn">{pr.logo_path && <img src={mediaUrl(pr.logo_path)} alt="" width="90" height="90" style={{ objectFit: 'cover', borderRadius: 12 }} />}<div><h1>{pr.business_name} {pr.verified && <span className="badge">✔ Verified</span>}</h1><p>{pr.location}{avg && ` · ★ ${avg} (${rv.data!.length})`}</p></div></div>
    <p>{pr.description}</p><ReportButton what={`${pr.business_name} (provider ${pr.id})`} />{pr.working_areas?.length > 0 && <p><b>Working areas:</b> {pr.working_areas.join(', ')}</p>}
    <p><b>Contact:</b> {pr.phone && <a href={`tel:${pr.phone}`}>{pr.phone}</a>} {pr.email && <a href={`mailto:${pr.email}`}>{pr.email}</a>}</p>
    <h2>Services</h2>{sv.data?.length === 0 && <p className="empty">No services listed yet.</p>}
    <div className="grid">{(sv.data ?? []).map(s => <article className="card" key={s.id}>{s.photos?.[0] && <img src={mediaUrl(s.photos[0])} alt="" loading="lazy" />}<h3>{s.title}</h3><p className="note">{s.service_categories?.name ?? s.custom_name}</p><p>{s.description}</p><p className="price">{priceText(s.price_type, s.price_from_ugx)}</p><p className="note">Min qty {s.min_qty}{s.production_days != null ? ` · ${s.production_days} day(s)` : ''} · {s.available ? 'Available' : 'Not available now'}</p></article>)}</div>
    {pf.data && pf.data.length > 0 && <><h2>Portfolio</h2><div className="grid">{pf.data.map(x => <figure key={x.id} style={{ margin: 0 }}><img src={mediaUrl(x.image_path)} alt={x.caption ?? 'Portfolio work'} loading="lazy" style={{ width: '100%' }} /><figcaption className="note">{x.caption}</figcaption></figure>)}</div></>}
    <h2>Request a quotation</h2>{done ? <p className="msg" role="status">Request {done} sent. The provider will reply with a quotation. Track it in <Link to="/providers/requests">My requests</Link>.</p> : !session ? <p className="empty"><Link to="/login">Sign in</Link> to request a quotation.</p> :
      <form className="sform" onSubmit={request}><label>Service<select name="service"><option value="">Not sure / other</option>{(sv.data ?? []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label>What do you need?<textarea name="details" rows={4} required maxLength={2000} /></label><div className="cbtn"><label>Quantity<input name="qty" type="number" min="1" /></label><label>Needed by<input name="needed" type="date" /></label><label>Your phone<input name="phone" type="tel" /></label></div>
        <button className="btn">Send request</button><Err m={msg} /></form>}
    <h2>Reviews</h2>{rv.data?.length === 0 && <p className="empty">No reviews yet. Only customers with a completed order can review.</p>}{rv.data?.map((r, i) => <p key={i} className="card">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} <small>{fmt(r.created_at)}</small><br />{r.comment}</p>)}</div>
}
