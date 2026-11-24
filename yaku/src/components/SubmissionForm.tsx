import { useState, FormEvent } from 'react'
import { supabase, supabaseReady } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
type F = [string, string, 'text' | 'email' | 'tel' | 'url' | 'number' | 'area' | 'select', boolean, string[]?]
const N: F = ['name', 'Full name', 'text', true], E: F = ['email', 'Email address', 'email', true], P: F = ['phone', 'Phone number', 'tel', true]
const forms: Record<string, { fields: F[]; files?: string; send: string }> = {
  contact: { send: 'Send message', fields: [N, E, ['phone', 'Phone number', 'tel', false], ['message', 'Message', 'area', true]] },
  career: { send: 'Submit application', files: 'Attach your CV and portfolio (PDF, Word or images)', fields: [N, E, P, ['area', 'Area of interest', 'select', true, ['Graphic design', 'Printing and branding', 'Sales and marketing', 'Customer service', 'Technology and software development', 'Vendor and business partnerships', 'Delivery and logistics']], ['message', 'Portfolio link or message', 'area', false]] },
  ipr: { send: 'Submit complaint', files: 'Supporting documents', fields: [N, E, ['work', 'Description of the copyrighted work', 'area', true], ['link', 'Link to the disputed material', 'url', true], ['evidence', 'Evidence of ownership or authorization', 'area', true]] },
  dispute: { send: 'Submit dispute', files: 'Photographs or documents', fields: [N, E, P, ['order_no', 'Order number', 'text', true], ['category', 'Dispute category', 'select', true, ['Incorrect product', 'Damaged product', 'Missing order', 'Delayed delivery', 'Payment problem', 'Printing quality', 'Branding disagreement', 'Vendor misconduct', 'Designer service complaint', 'Refund request', 'Other']], ['description', 'Description', 'area', true]] },
  return: { send: 'Submit return request', files: 'Photographs of the item or problem', fields: [N, E, P, ['order_no', 'Order number', 'text', true], ['product', 'Product name', 'text', true], ['reason', 'Reason for return', 'select', true, ['Damaged', 'Incorrect product', 'Missing item', 'Incomplete order', 'Not as described', 'Defective equipment', 'Printing error', 'Poor-quality customized product', 'Cancelled order', 'Other']], ['description', 'Description', 'area', true]] },
  printing: { send: 'Request a quotation', files: 'Upload your artwork (PDF or images, up to 5 files)', fields: [N, E, P, ['product_type', 'What do you want printed?', 'text', true], ['quantity', 'Quantity', 'number', true], ['specs', 'Size, colours, finish and other details', 'area', true]] },
  report: { send: 'Send report', files: 'Screenshots (optional)', fields: [E, ['link', 'Link to the product', 'url', true], ['reason', 'What is wrong?', 'area', true]] },
  partner: { send: 'Send details', fields: [N, E, P, ['business', 'Business or organization', 'text', false], ['message', 'Tell us more', 'area', true]] },
}
export default function SubmissionForm({ type, slug }: { type: string; slug: string }) {
  const cfg = forms[type]; const { session } = useAuth()
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [ref, setRef] = useState('')
  if (!cfg) return null
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabaseReady) return setMsg('Forms are not connected yet. Add your Supabase keys to .env.')
    const fd = new FormData(e.currentTarget); const data: Record<string, string> = { source: slug }
    cfg.fields.forEach(([k]) => { data[k] = String(fd.get(k) ?? '').trim() })
    const files = (fd.getAll('files') as File[]).filter(f => f.size > 0)
    if (files.length > 5 || files.some(f => f.size > 5 * 1024 * 1024)) return setMsg('Attach up to 5 files of 5 MB each.')
    setBusy(true); setMsg(''); const id = crypto.randomUUID(); const paths: string[] = []
    for (const f of files) {
      const p = `${type}/${id}/${f.name.replace(/[^\w.\-]+/g, '_')}`
      const { error } = await supabase.storage.from('submissions').upload(p, f)
      if (error) { setBusy(false); return setMsg(`Could not upload ${f.name}: ${error.message}`) }
      paths.push(p)
    }
    const { error } = await supabase.from('submissions').insert({ id, type, user_id: session?.user.id ?? null, data, files: paths })
    setBusy(false); if (error) return setMsg(`Could not send: ${error.message}`); setRef(id.slice(0, 8).toUpperCase())
  }
  if (ref) return <p className="msg" role="status">Thank you. We have received your submission. Reference: <strong>{ref}</strong>. Keep this reference if you contact us.</p>
  return <form className="sform" onSubmit={submit}>
    {cfg.fields.map(([k, label, kind, req, opts]) => <label key={k}>{label}{req ? '' : ' (optional)'}
      {kind === 'area' ? <textarea name={k} required={req} rows={4} /> : kind === 'select' ? <select name={k} required={req}><option value="">Choose…</option>{opts!.map(o => <option key={o}>{o}</option>)}</select> : <input name={k} type={kind} required={req} />}</label>)}
    {cfg.files && <label>{cfg.files}<input name="files" type="file" multiple accept="image/*,.pdf,.doc,.docx" /></label>}
    <button className="btn" disabled={busy}>{busy ? 'Sending…' : cfg.send}</button>
    {msg && <p role="alert" className="msg">{msg}</p>}
  </form>
}
