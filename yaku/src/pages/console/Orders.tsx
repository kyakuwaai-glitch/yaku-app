import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, fmt, ugx, Row } from './ui'
const S = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'], D = ['pending', 'dispatched', 'delivered', 'failed']
export default function Orders() {
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [msg, setMsg] = useState(''); const [open, setOpen] = useState('')
  const { data, err, reload } = useData<Row[]>(() => { let r: any = supabase.from('orders').select('*,order_items(*,vendors(name)),order_events(*),payments(*)').order('created_at', { ascending: false }).limit(100)
    if (st) r = r.eq('status', st); if (q) r = r.ilike('order_no', `%${q.replace(/[%,]/g, '')}%`); return r }, [q, st])
  const o = data?.find(x => x.id === open)
  const form = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); return new FormData(e.currentTarget) }
  const update = (e: FormEvent<HTMLFormElement>) => { const f = form(e); run(supabase.from('orders').update({ status: f.get('status'), delivery_status: f.get('delivery'), delivery_ref: f.get('ref') || null, status_note: f.get('note') || null }).eq('id', open), setMsg, 'Order updated.', reload) }
  const pay = (e: FormEvent<HTMLFormElement>) => { const f = form(e); run(supabase.from('payments').insert({ order_id: open, provider: f.get('provider'), provider_ref: String(f.get('reference')).trim(), amount: Number(f.get('amount')), gateway_fee: Number(f.get('fee') || 0), status: f.get('outcome') }), setMsg, 'Payment recorded.', reload) }
  return <div><div className="cbtn"><input placeholder="Order number" value={q} onChange={e => setQ(e.target.value)} /><select value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option>{S.map(s => <option key={s}>{s}</option>)}</select></div>
    <Err m={err || msg} />
    <Table rows={data} empty="No orders yet. Orders appear here when customers check out." cols={[['Order', r => <button className="link" onClick={() => setOpen(r.id)}>{r.order_no}</button>], ['Customer', r => r.customer_name], ['Status', r => r.status], ['Payment', r => r.payment_status], ['Delivery', r => r.delivery_status], ['Total', r => ugx(r.total)], ['Placed', r => fmt(r.created_at)]]} />
    {o && <section className="card sub"><h3>{o.order_no}</h3>
      <p>{o.customer_name} · {o.customer_phone ?? '–'} · {o.customer_email ?? '–'}<br />Deliver to: {o.delivery_address ?? '–'} {o.delivery_ref ? `· Ref ${o.delivery_ref}` : ''}</p>
      <Table rows={o.order_items} cols={[['Item', r => r.title], ['Seller', r => r.vendors?.name ?? 'YAKU'], ['Qty', r => r.qty], ['Unit price', r => ugx(r.unit_price)]]} />
      <form className="sform" onSubmit={update}><div className="cbtn"><select name="status" defaultValue={o.status}>{S.map(s => <option key={s}>{s}</option>)}</select><select name="delivery" defaultValue={o.delivery_status}>{D.map(s => <option key={s}>{s}</option>)}</select>
        <input name="ref" placeholder="Rider / tracking ref" defaultValue={o.delivery_ref ?? ''} /><input name="note" placeholder="Note (saved in history)" /><button className="btn">Update order</button></div></form>
      <h4>Payments</h4><Table rows={o.payments} empty="No payment recorded." cols={[['Provider', r => r.provider], ['Reference', r => r.provider_ref], ['Amount', r => ugx(r.amount)], ['Fee', r => ugx(r.gateway_fee)], ['Outcome', r => r.status], ['Date', r => fmt(r.created_at)]]} />
      <form className="sform" onSubmit={pay}><p className="note">Record a payment only after you have confirmed it with the provider. Duplicate provider references are rejected.</p>
        <div className="cbtn"><input name="provider" placeholder="Provider (e.g. MTN MoMo)" required /><input name="reference" placeholder="Transaction reference" required /><input name="amount" type="number" min="1" placeholder="Amount UGX" required defaultValue={o.total} /><input name="fee" type="number" min="0" placeholder="Gateway fee" />
          <select name="outcome"><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="refunded">Refund issued</option></select><button className="btn">Record payment</button></div></form>
      <h4>History</h4><Table rows={[...o.order_events].sort((a: Row, b: Row) => b.created_at.localeCompare(a.created_at))} cols={[['When', r => fmt(r.created_at)], ['Status', r => r.status], ['Delivery', r => r.delivery_status], ['Note', r => r.note ?? '']]} /></section>}</div>
}
