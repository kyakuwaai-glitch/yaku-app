import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, fmt, ugx, openFile, Row } from './ui'
const P = ['received', 'artwork_review', 'awaiting_approval', 'in_production', 'quality_check', 'ready', 'delivered'], D = ['pending', 'dispatched', 'delivered', 'failed']
export default function Printing() {
  const [msg, setMsg] = useState(''); const [sel, setSel] = useState('')
  const { data, err, reload } = useData<Row[]>(() => supabase.from('printing_requests').select('*,artworks(path,original_name),artwork_versions(path)').order('created_at', { ascending: false }).limit(100))
  const r = data?.find(x => x.id === sel); const f = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); return new FormData(e.currentTarget) }
  const up = (e: FormEvent<HTMLFormElement>, v: (f: FormData) => Row, ok: string) => run(supabase.from('printing_requests').update(v(f(e))).eq('id', sel), setMsg, ok, reload)
  return <div><Err m={err || msg} />
    <Table rows={data} empty="No printing requests yet." cols={[['Request', x => <button className="link" onClick={() => setSel(x.id)}>{x.request_no}</button>], ['Customer', x => x.name], ['Item', x => `${x.product_type ?? ''} × ${x.quantity ?? '?'}`], ['Quote', x => x.quote_status], ['Payment', x => x.payment_status], ['Production', x => x.production_status], ['Delivery', x => x.delivery_status], ['Received', x => fmt(x.created_at)]]} />
    {r && <section className="card sub"><h3>{r.request_no}</h3><p>{r.name} · {r.phone} · {r.email}<br />{r.specs}</p>
      <p>Artwork: {r.artwork_files?.length ? r.artwork_files.map((p: string) => <button key={p} className="link" onClick={() => openFile(p)}>{p.split('/').pop()}</button>) : 'none uploaded'}</p>
      {r.artworks?.path && <p>Studio artwork: <button className="link" onClick={() => openFile(r.artworks.path, 'artwork')}>{r.artworks.original_name}</button>{r.artwork_versions?.path && <> · <button className="link" onClick={() => openFile(r.artwork_versions.path, 'artwork')}>customer's corrected version</button></>} · customer approval: <b>{r.artwork_approved ? 'approved' : 'not yet'}</b></p>}
      {r.quote_status !== 'approved' && <form className="cbtn" onSubmit={e => up(e, x => ({ quote_amount: Number(x.get('amount')), quote_status: 'quoted' }), 'Quotation sent to the customer.')}><input name="amount" type="number" min="0" placeholder="Quote UGX" defaultValue={r.quote_amount ?? ''} required /><button className="btn">{r.quote_status === 'quoted' ? 'Update quote' : 'Send quote'}</button></form>}
      <p>Quote: <b>{r.quote_amount != null ? ugx(r.quote_amount) : 'not set'}</b> ({r.quote_status}). The customer approves or rejects it from their account.</p>
      {r.payment_status !== 'verified' ? <form className="cbtn" onSubmit={e => up(e, x => ({ payment_status: 'verified', payment_ref: String(x.get('ref')).trim() }), 'Payment verified.')}><input name="ref" placeholder="Payment reference (check with provider first)" required /><button className="btn">Verify payment</button></form> : <p>Payment verified (ref {r.payment_ref}) {fmt(r.payment_verified_at)}</p>}
      <form className="cbtn" onSubmit={e => up(e, x => ({ production_status: x.get('prod'), qc_passed: x.get('qc') === 'on', qc_notes: x.get('qcn') || null, delivery_status: x.get('del') }), 'Production record saved.')}>
        <select name="prod" defaultValue={r.production_status}>{P.map(s => <option key={s}>{s}</option>)}</select><label><input name="qc" type="checkbox" defaultChecked={!!r.qc_passed} /> Quality check passed</label><input name="qcn" placeholder="QC notes" defaultValue={r.qc_notes ?? ''} />
        <select name="del" defaultValue={r.delivery_status}>{D.map(s => <option key={s}>{s}</option>)}</select><button className="btn">Save</button></form>
      <p className="note">Production cannot start until the quote is approved and payment verified, and cannot be marked ready until the quality check passes.</p></section>}</div>
}
