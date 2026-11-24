import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { callFn, signed } from '../lib/ai'
type Row = Record<string, any>
const ugx = (n: unknown) => `UGX ${Math.round(Number(n ?? 0)).toLocaleString()}`
const FIX: Record<string, string> = { flatten_white: 'Fill transparent areas with white', add_bleed: 'Add 3 mm bleed by mirroring the edges', crop_to_ratio: 'Crop to the correct proportions' }
export default function PrintStudio({ mode = 'print' }: { mode?: 'print' | 'inspector' | 'pricing' }) {
  const { session } = useAuth(); const [sp] = useSearchParams()
  const [services, setServices] = useState<Row[]>([]); const [rules, setRules] = useState<Row[]>([])
  const [o, setO] = useState({ service: '', qty: 100, material: '', finish: '', w: 90, h: 55, design: false, express: false, delivery: false, details: '', phone: '' })
  const [quote, setQuote] = useState<Row | null>(null); const [art, setArt] = useState<Row | null>(null); const [rep, setRep] = useState<Row | null>(null); const [vers, setVers] = useState<Row[]>([])
  const [fixes, setFixes] = useState<string[]>([]); const [use, setUse] = useState('original'); const [urls, setUrls] = useState<Record<string, string>>({}); const [ok, setOk] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(''); const [done, setDone] = useState('')
  const target = { width_mm: o.w, height_mm: o.h, bleed_mm: 3 }; const set = (p: Partial<typeof o>) => setO({ ...o, ...p })
  useEffect(() => { Promise.resolve(supabase.from('print_services').select('id,slug,name,min_qty').eq('active', true).order('name')).then(({ data }) => setServices(data ?? []))
    Promise.resolve(supabase.from('price_rules').select('service_id,kind,name').in('kind', ['material', 'finish'])).then(({ data }) => setRules(data ?? [])) }, [])
  useEffect(() => { setQuote(null); if (!o.service || !(o.qty > 0)) return
    Promise.resolve(supabase.rpc('quote_print', { p_service: o.service, p_qty: o.qty, p_material: o.material || null, p_finish: o.finish || null, p_design: o.design, p_express: o.express, p_delivery: o.delivery })).then(({ data }) => setQuote(data)) }, [o.service, o.qty, o.material, o.finish, o.design, o.express, o.delivery])
  useEffect(() => { const id = sp.get('artwork'); if (id && session) Promise.resolve(supabase.from('artworks').select('*').eq('id', id).maybeSingle()).then(({ data }) => { if (data) setArt(data) }) }, [sp, session])
  const svc = services.find(s => s.slug === o.service); const opts = (k: string) => rules.filter(r => r.service_id === svc?.id && r.kind === k).map(r => r.name)
  async function upload(f: File | undefined) {
    if (!f || !session) return; setMsg(''); setRep(null); setVers([]); setFixes([]); const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['png', 'jpg', 'jpeg', 'pdf'].includes(ext ?? '')) return setMsg('Please upload a PNG, JPG or PDF file.'); if (f.size > 15 * 1024 * 1024) return setMsg('The file is larger than 15 MB.')
    setBusy('Uploading…'); const path = `${session.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, '_')}`
    const up = await supabase.storage.from('artwork').upload(path, f, { contentType: f.type }); if (up.error) { setBusy(''); return setMsg(up.error.message) }
    const { data, error } = await supabase.from('artworks').insert({ owner_id: session.user.id, path, original_name: f.name, mime: f.type, size_bytes: f.size }).select('*').single(); if (error) { setBusy(''); return setMsg(error.message) }
    setArt(data); setBusy(''); await inspect(data.id) }
  async function inspect(id: string) { setBusy('Inspecting your file…'); const { data, error } = await callFn('artwork-inspect', { artwork_id: id, target }); setBusy(''); if (error) return setMsg(error); setRep(data) }
  async function correct() { if (!art || !fixes.length) return; setBusy('Creating a corrected copy…'); const { data, error } = await callFn('artwork-correct', { artwork_id: art.id, fixes, target }); setBusy(''); if (error) return setMsg(error)
    const v = { id: data.version_id, path: data.path, note: data.notes.join('; ') }; setVers([v, ...vers]); setUse(v.id); setUrls({ ...urls, [v.id]: await signed(v.path), [v.id + 'd']: await signed(v.path, true) }) }
  useEffect(() => { if (art && art.mime !== 'application/pdf') signed(art.path).then(u => setUrls(x => ({ ...x, orig: u }))) }, [art])
  async function submit() { setBusy('Sending your request…'); setMsg(''); const ver = use === 'original' ? null : use
    const { data, error } = await supabase.rpc('submit_print_request', { p_service: o.service, p_qty: o.qty, p_material: o.material || null, p_finish: o.finish || null, p_design: o.design, p_express: o.express, p_delivery: o.delivery, p_details: `${o.w}×${o.h} mm. ${o.details}`, p_artwork: art?.id ?? null, p_version: ver, p_phone: o.phone || null })
    if (error) { setBusy(''); return setMsg(error.message) }
    if (art && ok) { const a = await supabase.rpc('approve_artwork', { p_request: data, p_version: ver }); if (a.error) setMsg(a.error.message) }
    setBusy(''); setDone(data) }
  async function help() { if (!session) return; const { error } = await supabase.from('tickets').insert({ user_id: session.user.id, category: 'designer_help', subject: 'Artwork help requested', description: `Please help with artwork ${art?.original_name} (${art?.id}).` }); setMsg(error ? error.message : 'A YAKU designer will contact you. We opened a support ticket.') }
  const issues: Row[] = rep?.issues ?? []; const m = rep?.metrics
  if (done) return <section className="form"><h1>Request sent</h1><p>Your printing request is saved. {quote?.instant ? 'A quotation is waiting for your approval in your account.' : 'We will send you a custom quotation.'} Production starts only after you approve the quote and YAKU verifies your payment.</p><Link className="btn" to="/dashboard">Go to my account</Link></section>
  return <div className="sec ps"><Helmet><title>Print Studio | YAKU Uganda</title><meta name="description" content="Get a printing quote, upload artwork and have it checked before printing at YAKU Uganda." /></Helmet><h1>{mode === 'inspector' ? 'Artwork Inspector' : mode === 'pricing' ? 'Price Calculator' : 'Print Studio'}</h1>
    {mode !== 'inspector' && <>
    <h2>1. What do you want printed?</h2>
    <div className="sform"><label>Service<select value={o.service} onChange={e => set({ service: e.target.value, material: '', finish: '' })}><option value="">Choose…</option>{services.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
      <div className="cbtn"><label>Quantity<input type="number" min={svc?.min_qty ?? 1} value={o.qty} onChange={e => set({ qty: Number(e.target.value) })} /></label><label>Finished width (mm)<input type="number" min="1" value={o.w} onChange={e => set({ w: Number(e.target.value) })} /></label><label>Finished height (mm)<input type="number" min="1" value={o.h} onChange={e => set({ h: Number(e.target.value) })} /></label></div>
      {opts('material').length > 0 && <label>Material<select value={o.material} onChange={e => set({ material: e.target.value })}><option value="">Standard</option>{opts('material').map(x => <option key={x}>{x}</option>)}</select></label>}
      {opts('finish').length > 0 && <label>Finishing<select value={o.finish} onChange={e => set({ finish: e.target.value })}><option value="">None</option>{opts('finish').map(x => <option key={x}>{x}</option>)}</select></label>}
      <div className="cbtn"><label><input type="checkbox" checked={o.design} onChange={e => set({ design: e.target.checked })} /> I need design help</label><label><input type="checkbox" checked={o.express} onChange={e => set({ express: e.target.checked })} /> Express</label><label><input type="checkbox" checked={o.delivery} onChange={e => set({ delivery: e.target.checked })} /> Delivery</label></div>
      <label>Anything else we should know?<textarea rows={3} value={o.details} onChange={e => set({ details: e.target.value })} /></label></div>
    {o.service && (quote?.instant ? <div className="card sub"><h3>Instant quotation</h3><ul>{quote.lines.map((l: Row, i: number) => <li key={i}>{l.label}: {ugx(l.amount)}</li>)}</ul><p><b>Total: {ugx(quote.total)}</b></p><p className="note">Calculated from YAKU's price list. Final confirmation happens after you approve the quote and payment is verified.</p></div> : quote ? <p className="empty">Custom quotation needed: {quote.reason}. Submit your request and our team will send you a price.</p> : <p>Calculating…</p>)}
    </>}
    {mode === 'inspector' && <div className="sform"><div className="cbtn"><label>Finished width (mm)<input type="number" min="1" value={o.w} onChange={e => set({ w: Number(e.target.value) })} /></label><label>Finished height (mm)<input type="number" min="1" value={o.h} onChange={e => set({ h: Number(e.target.value) })} /></label></div></div>}
    {mode === 'pricing' && <p><Link className="btn" to="/studio/print">Continue to Print Studio</Link></p>}
    {mode !== 'pricing' && <>
    <h2>{mode === 'inspector' ? 'Upload and check your artwork' : '2. Upload and check your artwork'}</h2>
    {!session ? <p className="empty"><Link to="/login">Sign in</Link> to upload artwork and send your request.</p> : <div className="sform"><label>Artwork file (PNG, JPG or PDF, up to 15 MB)<input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={e => upload(e.target.files?.[0])} /></label>
      <p className="note">Your original file is always kept unchanged. Need a design? Try the <Link to="/studio/design">Design Studio</Link>.</p></div>}
    {busy && <p className="msg" role="status">{busy}</p>}{msg && <p className="msg" role="alert">{msg}</p>}
    {rep && <section className="card sub"><h3>Inspection report</h3>
      <p className="note">{m?.kind === 'pdf' ? `PDF · ${m.pages ?? '?'} page(s)${m.mediaMm ? ` · ${m.mediaMm[0].toFixed(0)}×${m.mediaMm[1].toFixed(0)} mm` : ''}` : `${m?.width}×${m?.height} px · about ${m?.effective_dpi} DPI at this size${m?.dpi ? ` · file says ${m.dpi} DPI` : ''}`}</p>
      {issues.length === 0 && <p>No problems found by the automated checks.</p>}
      {issues.map((i, k) => <div key={k} className={`iss ${i.severity}`}><b>{i.title}</b><p><u>Why it matters:</u> {i.why}</p><p><u>Suggested fix:</u> {i.fix}</p>{i.auto?.map((a: string) => <label key={a}><input type="checkbox" checked={fixes.includes(a)} onChange={e => setFixes(e.target.checked ? [...fixes, a] : fixes.filter(x => x !== a))} /> {FIX[a]}</label>)}</div>)}
      {rep.ai_review?.status === 'not_configured' && <p className="note">AI visual review is switched off: missing server setting {rep.ai_review.missing.join(', ')}. File checks above still ran.</p>}
      {rep.ai_review?.reason === 'AI consent not given' && <p className="note">AI visual review is off. Agree to AI data sharing in <Link to="/studio/assistant">YAKU AI</Link> to turn it on.</p>}
      {rep.ai_review?.status === 'failed' && <p className="note">{rep.ai_review.error}</p>}
      <p className="note">{rep.note}</p><div className="cbtn"><button className="btn" disabled={!fixes.length || !!busy} onClick={correct}>Create corrected copy</button><button className="btn ghost" onClick={help}>Ask a designer for help</button></div></section>}
    {art && (vers.length > 0 || rep) && <section className="card sub"><h3>{mode === 'inspector' ? 'Compare original and corrected' : 'Choose the version to print'}</h3>
      <div className="cmp"><label><input type="radio" name="v" checked={use === 'original'} onChange={() => setUse('original')} /> Original{urls.orig ? <img src={urls.orig} alt="Original artwork" /> : <p>{art.original_name}</p>}</label>
        {vers.map(v => <label key={v.id}><input type="radio" name="v" checked={use === v.id} onChange={() => setUse(v.id)} /> Corrected<img src={urls[v.id]} alt="Corrected artwork" /><small>{v.note}</small><a href={urls[v.id + 'd']}>Download corrected file</a></label>)}</div></section>}
    </>}
    {mode === 'print' && <><h2>3. Send your request</h2>
    <div className="sform"><label>Phone number<input type="tel" value={o.phone} onChange={e => set({ phone: e.target.value })} /></label>
      {art && <label><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I have reviewed the artwork version selected above and approve it for printing.</label>}
      <button className="btn" disabled={!session || !o.service || !!busy} onClick={submit}>Send printing request</button></div></>}</div>
}
