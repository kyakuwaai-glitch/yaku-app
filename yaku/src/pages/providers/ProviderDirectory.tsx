import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../../lib/supabase'
import { useData, Err, Row } from '../console/ui'
import { mediaUrl, priceText } from '../../lib/providers'
export default function ProviderDirectory() {
  const [f, setF] = useState({ q: '', cat: '', loc: '' }); const [sel, setSel] = useState<string[]>([]); const clean = (s: string) => s.replace(/[%,]/g, '').trim() || null
  const cats = useData<Row[]>(() => supabase.from('service_categories').select('slug,name').eq('status', 'approved').order('name'))
  const { data, err } = useData<Row[]>(() => supabase.rpc('search_services', { p_q: clean(f.q), p_category: f.cat || null, p_location: clean(f.loc) }), [f.q, f.cat, f.loc])
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget); setF({ q: String(d.get('q')), cat: String(d.get('cat')), loc: String(d.get('loc')) }) }
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s); const cmp = (data ?? []).filter(r => sel.includes(r.service_id))
  return <div className="sec"><Helmet><title>Find service providers | YAKU Uganda</title><meta name="description" content="Find registered service providers in Uganda for rubber stamps, embroidery, printing, signs, engraving, photography, tailoring and more." /></Helmet>
    <h1>Service Providers</h1><div className="cbtn"><Link className="btn ghost" to="/providers/join">Become a provider</Link><Link className="btn ghost" to="/providers/requests">My requests</Link><Link className="btn ghost" to="/provider">Provider dashboard</Link></div>
    <form className="sform" onSubmit={submit}><div className="cbtn"><input name="q" placeholder="What do you need? (e.g. rubber stamp)" defaultValue={f.q} aria-label="Search services" /><select name="cat" defaultValue={f.cat} aria-label="Category"><option value="">All services</option>{(cats.data ?? []).map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select><input name="loc" placeholder="Location" defaultValue={f.loc} aria-label="Location" /><button className="btn">Search</button></div></form>
    <Err m={err} />{data && data.length === 0 && <p className="empty">No registered providers match yet. Try another search, or check back as more providers join.</p>}
    <div className="grid">{(data ?? []).map(r => <article className="card" key={r.service_id}>{r.photo ? <img src={mediaUrl(r.photo)} alt="" loading="lazy" /> : r.logo_path ? <img src={mediaUrl(r.logo_path)} alt="" loading="lazy" /> : null}
      <h3>{r.title}</h3><p className="note">{r.category}</p><p><Link to={`/providers/${r.provider_id}`}><b>{r.business_name}</b></Link>{r.verified && <span className="badge">✔ Verified</span>}<br />{r.location ?? ''}</p>
      <p className="price">{priceText(r.price_type, r.price_from_ugx)}</p><p className="note">Min qty {r.min_qty}{r.production_days != null ? ` · ${r.production_days} day(s)` : ''} · {r.available ? 'Available' : 'Not available now'}{r.reviews > 0 ? ` · ★ ${r.rating} (${r.reviews})` : ''}</p>
      <label><input type="checkbox" checked={sel.includes(r.service_id)} onChange={() => toggle(r.service_id)} /> Compare</label> <Link className="btn ghost" to={`/providers/${r.provider_id}`}>View &amp; request quote</Link></article>)}</div>
    {cmp.length > 1 && <div className="tw"><h2>Compare</h2><table><thead><tr><th></th>{cmp.map(r => <th key={r.service_id}>{r.business_name}</th>)}</tr></thead><tbody>{([['Service', (r: Row) => r.title], ['Price', (r: Row) => priceText(r.price_type, r.price_from_ugx)], ['Minimum quantity', (r: Row) => r.min_qty], ['Production time', (r: Row) => r.production_days != null ? `${r.production_days} day(s)` : 'Ask provider'], ['Available', (r: Row) => r.available ? 'Yes' : 'No'], ['Location', (r: Row) => r.location ?? '–'], ['Rating', (r: Row) => r.reviews > 0 ? `${r.rating} (${r.reviews})` : 'No reviews yet']] as [string, (r: Row) => any][]).map(([l, fn]) => <tr key={l}><th>{l}</th>{cmp.map(r => <td key={r.service_id}>{fn(r)}</td>)}</tr>)}</tbody></table></div>}</div>
}
