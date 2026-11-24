import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, fmt, ugx, Row } from './ui'
import { PagesTab, SettingsTab, CampaignsTab } from '../Admin'
import { clearStorefrontCache, bannerImg, useDepartments } from '../../lib/storefront'
import { HOME_KEYS } from '../Home'
const TABS = ['Banners & ads', 'Departments', 'Homepage', 'Products', 'Pages', 'Footer & contact', 'Flash sales']
const PLACE: [string, string][] = [['hero', 'Homepage hero banner'], ['promo', 'Promo banner (bottom of homepage)'], ['strip', 'Top announcement strip'], ['home', 'Ad slot on the homepage'], ['department', 'Ad slot on department pages']]
const LABEL: Record<string, string> = { categories: 'Shop by category', popular: 'Popular products', services: 'Printing & branding services', flash: 'Flash deals', recommended: 'Recommended for you', vendors: 'Featured vendors', designers: 'Featured designers', promos: 'Promotions' }
async function upload(file: File, folder: string): Promise<{ path?: string; error?: string }> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { error: 'Choose a PNG, JPG or WebP image.' }; if (file.size > 5 * 1024 * 1024) return { error: 'Images must be under 5 MB.' }
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`; const { error } = await supabase.storage.from('store-media').upload(path, file, { contentType: file.type }); return error ? { error: error.message } : { path }
}
const loc = (v?: string | null) => (v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
export default function Storefront() {
  const [tab, setTab] = useState(TABS[0])
  return <div><p className="note">Changes appear on the live storefront right away. Images: PNG, JPG or WebP under 5 MB. Links must start with / (inside YAKU) or https://.</p>
    <div className="tabs">{TABS.map(t => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Banners & ads' && <Banners />}{tab === 'Departments' && <Depts />}{tab === 'Homepage' && <Home />}{tab === 'Products' && <ProductContent />}
    {tab === 'Pages' && <PagesTab />}{tab === 'Footer & contact' && <SettingsTab />}{tab === 'Flash sales' && <CampaignsTab />}</div>
}
function Banners() {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const [sel, setSel] = useState<Row | null>(null)
  const { data, err } = useData<Row[]>(() => supabase.from('banners').select('*').order('placement').order('sort_order'), [n]); const done = (m: string) => { clearStorefrontCache(); setMsg(m); setN(x => x + 1) }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); let image_path = sel?.image_path ?? null; const file = f.get('img') as File
    if (file && file.size > 0) { const r = await upload(file, 'banners'); if (r.error) return setMsg(r.error); image_path = r.path }
    const dt = (k: string) => (f.get(k) ? new Date(String(f.get(k))).toISOString() : null)
    const row = { placement: f.get('placement'), title: String(f.get('title')).trim(), subtitle: f.get('sub') || null, button_text: f.get('btn') || null, link_url: f.get('link') || null, image_path, sort_order: Number(f.get('ord') || 0), active: f.get('active') === 'on', starts_at: dt('from'), ends_at: dt('to') }
    const { error } = sel ? await supabase.from('banners').update(row).eq('id', sel.id) : await supabase.from('banners').insert(row); if (error) return setMsg(error.message); const was = sel; setSel(null); form.reset(); done(was ? 'Banner updated.' : 'Banner posted.') }
  return <div><Err m={err || msg} /><form key={sel?.id ?? 'new'} className="sform" onSubmit={save}><h3>{sel ? 'Edit banner' : 'Post a banner or ad'}</h3>
    <div className="cbtn"><select name="placement" defaultValue={sel?.placement ?? 'hero'}>{PLACE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><input name="title" placeholder="Headline" required defaultValue={sel?.title ?? ''} /><input name="sub" placeholder="Sub-text" defaultValue={sel?.subtitle ?? ''} /></div>
    <div className="cbtn"><input name="btn" placeholder="Button text" defaultValue={sel?.button_text ?? ''} /><input name="link" placeholder="/department/mugs or https://…" pattern="^(/|https://).*" defaultValue={sel?.link_url ?? ''} /><input name="ord" type="number" placeholder="Order" defaultValue={sel?.sort_order ?? 0} /></div>
    <div className="cbtn"><label>Show from<input name="from" type="datetime-local" defaultValue={loc(sel?.starts_at)} /></label><label>Show until<input name="to" type="datetime-local" defaultValue={loc(sel?.ends_at)} /></label><label><input name="active" type="checkbox" defaultChecked={sel?.active ?? true} /> Active</label></div>
    <label>Image {sel?.image_path && '(leave empty to keep the current one)'}<input name="img" type="file" accept="image/png,image/jpeg,image/webp" /></label>
    <div className="cbtn"><button className="btn">{sel ? 'Save changes' : 'Post'}</button>{sel && <button type="button" className="btn ghost" onClick={() => setSel(null)}>Cancel</button>}</div></form>
    <Table rows={data} empty="No banners yet. The built-in banners show until you post one." cols={[['Image', r => r.image_path ? <img src={bannerImg(r.image_path)} alt="" width="70" /> : '–'], ['Where', r => PLACE.find(p => p[0] === r.placement)?.[1]], ['Headline', r => r.title], ['Dates', r => `${r.starts_at ? fmt(r.starts_at) : 'now'} to ${r.ends_at ? fmt(r.ends_at) : 'no end'}`], ['Clicks', r => r.clicks],
      ['Active', r => <button className="link" onClick={() => run(supabase.from('banners').update({ active: !r.active }).eq('id', r.id), setMsg, 'Updated.', () => done('Updated.'))}>{r.active ? 'Yes (turn off)' : 'No (turn on)'}</button>],
      ['', r => <span className="cbtn"><button className="btn ghost" onClick={() => setSel(r)}>Edit</button><button className="btn ghost" onClick={() => confirm('Delete this banner?') && run(supabase.from('banners').delete().eq('id', r.id), setMsg, 'Deleted.', () => done('Deleted.'))}>Delete</button></span>]]} /></div>
}
function Depts() {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const { data, err } = useData<Row[]>(() => supabase.from('departments').select('*').order('sort_order'), [n]); const done = (m: string) => { clearStorefrontCache(); setMsg(m); setN(x => x + 1) }
  const add = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('departments').insert({ slug: String(f.get('slug')).trim().toLowerCase(), name: String(f.get('name')).trim(), sort_order: Number(f.get('ord') || 0) }), setMsg, 'Department added.', () => done('Department added.')) }
  const upd = (e: FormEvent<HTMLFormElement>, id: string) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('departments').update({ name: String(f.get('name')).trim(), sort_order: Number(f.get('ord') || 0), active: f.get('active') === 'on' }).eq('id', id), setMsg, 'Saved.', () => done('Saved.')) }
  return <div><Err m={err || msg} /><form className="cbtn" onSubmit={add}><input name="slug" placeholder="web-address (letters, numbers, dashes)" pattern="[a-z0-9-]+" required /><input name="name" placeholder="Department name" required /><input name="ord" type="number" placeholder="Order" /><button className="btn">Add department</button></form>
    <p className="note">The web address cannot be changed after creation (products are linked to it). To hide a department, untick Active.</p>
    <Table rows={data} cols={[['Address', r => r.slug], ['Edit', r => <form className="cbtn" onSubmit={e => upd(e, r.id)}><input name="name" defaultValue={r.name} required /><input name="ord" type="number" defaultValue={r.sort_order} style={{ width: 80 }} /><label><input name="active" type="checkbox" defaultChecked={r.active} /> Active</label><button className="btn ghost">Save</button></form>]]} /></div>
}
function Home() {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const { data, err } = useData<Row[]>(() => supabase.from('home_sections').select('*'), [n]); const by: Record<string, Row> = Object.fromEntries((data ?? []).map(r => [r.key, r]))
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget)
    run(supabase.from('home_sections').upsert(HOME_KEYS.map(k => ({ key: k, title: String(f.get('t_' + k)).trim() || LABEL[k], visible: f.get('v_' + k) === 'on', sort_order: Number(f.get('o_' + k)) }))), setMsg, 'Homepage saved.', () => { clearStorefrontCache(); setN(x => x + 1) }) }
  return <div><Err m={err || msg} />{data && <form key={n} className="sform" onSubmit={save}><p className="note">Rename, hide or reorder the homepage sections (lower numbers come first). The hero banner stays at the top.</p>
    {HOME_KEYS.map((k, i) => <div className="cbtn" key={k}><input name={'t_' + k} defaultValue={by[k]?.title ?? LABEL[k]} aria-label={LABEL[k]} /><input name={'o_' + k} type="number" defaultValue={by[k]?.sort_order ?? i * 10} style={{ width: 90 }} /><label><input name={'v_' + k} type="checkbox" defaultChecked={by[k]?.visible ?? true} /> Show</label></div>)}<button className="btn">Save homepage</button></form>}</div>
}
function ProductContent() {
  const depts = useDepartments(); const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const [sel, setSel] = useState<Row | null>(null)
  const { data, err } = useData<Row[]>(() => supabase.from('products').select('id,title,description,department,kind,price_ugx,flash_price_ugx,image_path,status').order('created_at', { ascending: false }).limit(200), [n])
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); let image_path = sel?.image_path ?? null; const file = f.get('img') as File
    const num = (k: string) => (f.get(k) === '' || f.get(k) === null ? null : Number(f.get(k))); const price = num('price'), flash = num('flash')
    if (flash != null && (price == null || flash >= price)) return setMsg('The promotional price must be lower than the regular price.')
    if (file && file.size > 0) { const r = await upload(file, 'products'); if (r.error) return setMsg(r.error); image_path = r.path }
    const row = { title: String(f.get('title')).trim(), description: f.get('desc') || null, department: f.get('dept'), kind: f.get('kind'), price_ugx: price, flash_price_ugx: flash, status: f.get('status'), image_path }
    const { error } = sel ? await supabase.from('products').update(row).eq('id', sel.id) : await supabase.from('products').insert(row); if (error) return setMsg(error.message); const was = sel; setSel(null); form.reset(); clearStorefrontCache(); setMsg(was ? 'Product updated.' : 'Product added (stock is set in Inventory).'); setN(x => x + 1) }
  return <div><Err m={err || msg} /><form key={sel?.id ?? 'new'} className="sform" onSubmit={save}><h3>{sel ? 'Edit product' : 'Post a product or service'}</h3>
    <div className="cbtn"><input name="title" placeholder="Title" required defaultValue={sel?.title ?? ''} /><select name="dept" defaultValue={sel?.department}>{depts.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select><select name="kind" defaultValue={sel?.kind ?? 'product'}><option value="product">Product</option><option value="service">Service</option></select></div>
    <label>Description<textarea name="desc" rows={3} defaultValue={sel?.description ?? ''} /></label>
    <div className="cbtn"><input name="price" type="number" min="0" placeholder="Price UGX" defaultValue={sel?.price_ugx ?? ''} /><input name="flash" type="number" min="0" placeholder="Promo price UGX (optional)" defaultValue={sel?.flash_price_ugx ?? ''} /><select name="status" defaultValue={sel?.status ?? 'draft'}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></div>
    <label>Photo {sel?.image_path && '(leave empty to keep the current one)'}<input name="img" type="file" accept="image/png,image/jpeg,image/webp" /></label>
    <div className="cbtn"><button className="btn">{sel ? 'Save changes' : 'Add'}</button>{sel && <button type="button" className="btn ghost" onClick={() => setSel(null)}>Cancel</button>}</div></form>
    <Table rows={data} empty="No products yet." cols={[['Photo', r => r.image_path ? <img src={bannerImg(r.image_path)} alt="" width="50" /> : '–'], ['Title', r => r.title], ['Department', r => r.department], ['Price', r => ugx(r.price_ugx)], ['Promo', r => r.flash_price_ugx ? ugx(r.flash_price_ugx) : '–'], ['Status', r => r.status], ['', r => <button className="btn ghost" onClick={() => setSel(r)}>Edit</button>]]} /></div>
}
