import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, fmt, ugx, Row } from './ui'
export default function Vendors() {
  const [msg, setMsg] = useState(''); const [t, setT] = useState(0); const after = () => setT(x => x + 1)
  const apps = useData<Row[]>(() => supabase.rpc('list_role_requests'), [t]); const vs = useData<Row[]>(() => supabase.from('vendors').select('*').order('name'), [t])
  const rep = useData<Row[]>(() => supabase.rpc('vendor_report'), [t]); const pp = useData<Row[]>(() => supabase.from('products').select('id,title,price_ugx,vendors(name)').eq('status', 'pending'), [t])
  const st = useData<Row[]>(() => supabase.from('settlements').select('*,vendors(name)').order('paid_at', { ascending: false }).limit(50), [t])
  const R: Record<string, Row> = Object.fromEntries((rep.data ?? []).map(r => [r.vendor_id, r]))
  const decide = (id: string, ok: boolean) => run(supabase.rpc('approve_request', { p_id: id, p_approve: ok }), setMsg, ok ? 'Approved.' : 'Rejected.', after)
  const setStatus = (id: string, s: string) => run(supabase.from('vendors').update({ status: s, approved: s === 'approved' }).eq('id', id), setMsg, 'Vendor updated.', after)
  const pct = (e: FormEvent<HTMLFormElement>, id: string) => { e.preventDefault(); run(supabase.from('vendors').update({ commission_pct: Number(new FormData(e.currentTarget).get('pct')) }).eq('id', id), setMsg, 'Commission saved.', after) }
  const product = (id: string, s: string) => run(supabase.from('products').update({ status: s }).eq('id', id), setMsg, 'Product updated.', after)
  const settle = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('settlements').insert({ vendor_id: f.get('vendor'), amount: Number(f.get('amount')), reference: String(f.get('ref')).trim(), note: f.get('note') || null }), setMsg, 'Settlement recorded.', after) }
  return <div><Err m={apps.err || vs.err || msg} /><h3>Applications</h3>
    <Table rows={(apps.data ?? []).filter(a => a.status === 'pending')} empty="No pending applications." cols={[['Name', r => r.full_name], ['Email', r => r.email], ['Type', r => r.requested_role], ['Applied', r => fmt(r.created_at)], ['', r => <span className="cbtn"><button className="btn" onClick={() => decide(r.id, true)}>Approve</button><button className="btn ghost" onClick={() => decide(r.id, false)}>Reject</button></span>]]} />
    <h3>Vendors, commission and earnings</h3>
    <Table rows={vs.data} empty="No vendors yet." cols={[['Vendor', r => r.name], ['Status', r => r.status], ['Commission %', r => <form className="cbtn" onSubmit={e => pct(e, r.id)}><input name="pct" type="number" step="0.01" min="0" max="100" defaultValue={r.commission_pct ?? ''} /><button className="btn ghost">Set</button></form>],
      ['Gross sales', r => ugx(R[r.id]?.gross)], ['Commission', r => ugx(R[r.id]?.commission)], ['Earnings', r => ugx(R[r.id]?.earnings)], ['Settled', r => ugx(R[r.id]?.settled)], ['Balance', r => ugx(R[r.id]?.balance)],
      ['', r => r.status === 'suspended' ? <button className="btn ghost" onClick={() => setStatus(r.id, 'approved')}>Reactivate</button> : <button className="btn ghost" onClick={() => setStatus(r.id, 'suspended')}>Suspend</button>]]} />
    <p className="note">Commission % applies to new orders when they are created. Earnings count paid orders only.</p>
    <h3>Vendor products awaiting approval</h3>
    <Table rows={pp.data} empty="No products waiting." cols={[['Product', r => r.title], ['Vendor', r => r.vendors?.name], ['Price', r => ugx(r.price_ugx)], ['', r => <span className="cbtn"><button className="btn" onClick={() => product(r.id, 'published')}>Approve</button><button className="btn ghost" onClick={() => product(r.id, 'draft')}>Reject</button></span>]]} />
    <h3>Settlements</h3><form className="cbtn" onSubmit={settle}><select name="vendor" required>{(vs.data ?? []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><input name="amount" type="number" min="1" placeholder="Amount UGX" required /><input name="ref" placeholder="Payment reference" required /><input name="note" placeholder="Note" /><button className="btn">Record settlement</button></form>
    <Table rows={st.data} empty="No settlements recorded." cols={[['Date', r => fmt(r.paid_at)], ['Vendor', r => r.vendors?.name], ['Amount', r => ugx(r.amount)], ['Reference', r => r.reference], ['Note', r => r.note ?? '']]} /></div>
}
