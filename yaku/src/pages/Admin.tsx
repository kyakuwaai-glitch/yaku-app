import { useEffect, useState, FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase, Product, ugx } from '../lib/supabase'
import { defaultPages, defaultSettings } from '../content/pages'
import { clearSettingsCache } from '../lib/cms'
type Row = Record<string, any>
const tabs = ['Pages', 'Settings', 'Submissions', 'Campaigns'] as const
export default function Admin() {
  const [tab, setTab] = useState<typeof tabs[number]>('Pages')
  return <div className="sec"><Helmet><meta name="robots" content="noindex" /></Helmet><h1>Manage company content</h1>
    <div className="tabs">{tabs.map(t => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Pages' && <PagesTab />}{tab === 'Settings' && <SettingsTab />}{tab === 'Submissions' && <SubmissionsTab />}{tab === 'Campaigns' && <CampaignsTab />}</div>
}
export function PagesTab() {
  const slugs = Object.keys(defaultPages); const [slug, setSlug] = useState(slugs[0]); const [f, setF] = useState({ title: '', description: '', body: '' }); const [msg, setMsg] = useState('')
  useEffect(() => { setMsg(''); const d = defaultPages[slug]; setF({ title: d.t, description: '', body: d.b })
    Promise.resolve(supabase.from('pages').select('title,description,body').eq('slug', slug).maybeSingle()).then(({ data }) => { if (data) setF({ title: data.title, description: data.description ?? '', body: data.body }) }) }, [slug])
  const save = async (e: FormEvent) => { e.preventDefault(); const { error } = await supabase.from('pages').upsert({ slug, ...f, updated_at: new Date().toISOString() }); setMsg(error ? error.message : 'Saved. The page now shows a new update date.') }
  const reset = async () => { const { error } = await supabase.from('pages').delete().eq('slug', slug); if (error) return setMsg(error.message); const d = defaultPages[slug]; setF({ title: d.t, description: '', body: d.b }); setMsg('Reset to starter text.') }
  return <form onSubmit={save} className="sform"><label>Page<select value={slug} onChange={e => setSlug(e.target.value)}>{slugs.map(s => <option key={s} value={s}>{defaultPages[s].t}</option>)}</select></label>
    <label>Title<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required /></label>
    <label>SEO description<input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} maxLength={160} /></label>
    <label>Content (## heading, - list, **bold**, [text](/info/page), {'{{phone}}'} {'{{email}}'} {'{{address}}'} {'{{business_name}}'})<textarea rows={18} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} required /></label>
    <div className="cbtn"><button className="btn">Save page</button><button type="button" className="btn ghost" onClick={reset}>Reset to starter text</button></div>{msg && <p className="msg">{msg}</p>}</form>
}
export function SettingsTab() {
  const [v, setV] = useState<Record<string, string>>({ ...defaultSettings }); const [msg, setMsg] = useState('')
  useEffect(() => { Promise.resolve(supabase.from('site_settings').select('key,value')).then(({ data }) => { if (data) setV(p => ({ ...p, ...Object.fromEntries(data.map((r: Row) => [r.key, r.value ?? ''])) })) }) }, [])
  const save = async (e: FormEvent) => { e.preventDefault(); const { error } = await supabase.from('site_settings').upsert(Object.entries(v).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }))); clearSettingsCache(); setMsg(error ? error.message : 'Saved. Reload public pages to see changes.') }
  return <form onSubmit={save} className="sform">{Object.keys(defaultSettings).map(k => <label key={k}>{k.replace('_', ' ')}<input value={v[k] ?? ''} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>)}<button className="btn">Save settings</button>{msg && <p className="msg">{msg}</p>}</form>
}
function SubmissionsTab() {
  const [type, setType] = useState(''); const [rows, setRows] = useState<Row[]>([]); const [msg, setMsg] = useState('')
  const load = () => { let q = supabase.from('submissions').select('*').order('created_at', { ascending: false }).limit(100); if (type) q = q.eq('type', type); Promise.resolve(q).then(({ data, error }) => { setRows(data ?? []); if (error) setMsg(error.message) }) }
  useEffect(load, [type])
  const upd = async (id: string, status: string, resolution: string) => { const { error } = await supabase.from('submissions').update({ status, resolution, updated_at: new Date().toISOString() }).eq('id', id); setMsg(error ? error.message : 'Updated.'); load() }
  const open = async (p: string) => { const { data } = await supabase.storage.from('submissions').createSignedUrl(p, 300); if (data) window.open(data.signedUrl, '_blank', 'noopener') }
  return <div><label>Type <select value={type} onChange={e => setType(e.target.value)}><option value="">All</option>{['contact', 'career', 'ipr', 'dispute', 'return', 'report', 'partner'].map(t => <option key={t}>{t}</option>)}</select></label>{msg && <p className="msg">{msg}</p>}
    {rows.length === 0 && <p className="empty">No submissions yet.</p>}
    {rows.map(r => <details key={r.id} className="card sub"><summary>{r.type} · {r.data?.name ?? r.data?.email} · {new Date(r.created_at).toLocaleDateString()} · <b>{r.status}</b></summary>
      <dl>{Object.entries(r.data).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
      {r.files?.map((p: string) => <button key={p} className="link" onClick={() => open(p)}>{p.split('/').pop()}</button>)}
      {r.data?.email && <p><a href={`mailto:${r.data.email}?subject=YAKU ${r.type} ${r.id.slice(0, 8).toUpperCase()}`}>Reply by email</a></p>}
      <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); upd(r.id, String(f.get('status')), String(f.get('resolution'))) }} className="sform">
        <select name="status" defaultValue={r.status}>{['new', 'in_review', 'resolved', 'rejected'].map(s => <option key={s}>{s}</option>)}</select>
        <textarea name="resolution" rows={3} placeholder="Resolution or notes" defaultValue={r.resolution ?? ''} /><button className="btn">Save</button></form></details>)}</div>
}
export function CampaignsTab() {
  const [cs, setCs] = useState<Row[]>([]); const [prods, setProds] = useState<Product[]>([]); const [msg, setMsg] = useState('')
  const load = () => { Promise.resolve(supabase.from('campaigns').select('*,campaign_items(*,products(title,price_ugx))').order('starts_at', { ascending: false })).then(({ data }) => setCs(data ?? [])) }
  useEffect(() => { load(); Promise.resolve(supabase.from('products').select('id,title,price_ugx').eq('status', 'published').limit(200)).then(({ data }) => setProds((data as Product[]) ?? [])) }, [])
  const done = (error: { message: string } | null, ok: string) => { setMsg(error ? error.message : ok); load() }
  const create = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget)
    done((await supabase.from('campaigns').insert({ kind: f.get('kind'), title: f.get('title'), starts_at: new Date(String(f.get('starts'))).toISOString(), ends_at: new Date(String(f.get('ends'))).toISOString(), active: f.get('active') === 'on' })).error, 'Campaign created.') }
  const addItem = async (e: FormEvent<HTMLFormElement>, id: string) => { e.preventDefault(); const f = new FormData(e.currentTarget); const lim = String(f.get('limit'))
    done((await supabase.from('campaign_items').insert({ campaign_id: id, product_id: f.get('product'), promo_price_ugx: Number(f.get('price')), stock_limit: lim ? Number(lim) : null })).error, 'Item added.') }
  return <div><form onSubmit={create} className="sform"><h2>New campaign</h2>
    <select name="kind"><option value="flash_sale">Flash sale</option><option value="black_friday">Black Friday</option></select>
    <input name="title" placeholder="Campaign title" required /><label>Starts<input name="starts" type="datetime-local" required /></label><label>Ends<input name="ends" type="datetime-local" required /></label>
    <label><input name="active" type="checkbox" /> Active (visible to the public during its dates)</label><button className="btn">Create campaign</button></form>{msg && <p className="msg">{msg}</p>}
    {cs.map(c => <section key={c.id} className="card sub"><h3>{c.title} · {c.kind}</h3><p>{new Date(c.starts_at).toLocaleString()} to {new Date(c.ends_at).toLocaleString()} · {c.active ? 'Active' : 'Inactive'}</p>
      <div className="cbtn"><button className="btn ghost" onClick={async () => done((await supabase.from('campaigns').update({ active: !c.active }).eq('id', c.id)).error, 'Updated.')}>{c.active ? 'Deactivate' : 'Activate'}</button>
        <button className="btn ghost" onClick={async () => confirm('Delete this campaign?') && done((await supabase.from('campaigns').delete().eq('id', c.id)).error, 'Deleted.')}>Delete</button></div>
      <table><thead><tr><th>Product</th><th>Regular</th><th>Promo</th><th>Sold / limit</th></tr></thead><tbody>{c.campaign_items.map((i: Row) => <tr key={i.id}><td>{i.products?.title}</td><td>{ugx(i.products?.price_ugx)}</td><td>{ugx(i.promo_price_ugx)}</td><td>{i.sold} / {i.stock_limit ?? '–'}</td></tr>)}</tbody></table>
      <form onSubmit={e => addItem(e, c.id)} className="cbtn"><select name="product" required>{prods.map(p => <option key={p.id} value={p.id}>{p.title} ({ugx(p.price_ugx)})</option>)}</select>
        <input name="price" type="number" min="1" placeholder="Promo price UGX" required /><input name="limit" type="number" min="0" placeholder="Stock limit" /><button className="btn">Add item</button></form></section>)}</div>
}
