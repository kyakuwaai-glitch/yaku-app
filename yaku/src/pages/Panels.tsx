import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Chat from '../components/Chat'
import { useData, Err, Table, Stat, run, fmt, ugx, Row } from './console/ui'
export function CustomerPanel() {
  const [t, setT] = useState(0); const [msg, setMsg] = useState('')
  const o = useData<Row[]>(() => supabase.from('orders').select('id,order_no,status,payment_status,delivery_status,total,created_at').order('created_at', { ascending: false }))
  const pr = useData<Row[]>(() => supabase.from('printing_requests').select('*').order('created_at', { ascending: false }), [t]); const tk = useData<Row[]>(() => supabase.from('tickets').select('id,ticket_no,subject,status,created_at').order('created_at', { ascending: false }))
  const reply = (id: string, ok: boolean) => run(supabase.rpc('respond_quote', { p_id: id, p_approve: ok }), setMsg, ok ? 'Quotation approved.' : 'Quotation declined.', () => setT(x => x + 1))
  return <div><Err m={o.err || msg} /><h3>My orders</h3><Table rows={o.data} empty="You have no orders yet." cols={[['Order', r => r.order_no], ['Status', r => r.status], ['Payment', r => r.payment_status], ['Delivery', r => r.delivery_status], ['Total', r => ugx(r.total)], ['Date', r => fmt(r.created_at)]]} />
    <h3>My printing requests</h3><Table rows={pr.data} empty="No printing requests yet." cols={[['Request', r => r.request_no], ['Item', r => r.product_type], ['Quote', r => r.quote_amount != null ? ugx(r.quote_amount) : 'Awaiting quote'], ['Production', r => r.production_status], ['', r => r.quote_status === 'quoted' ? <span className="cbtn"><button className="btn" onClick={() => reply(r.id, true)}>Approve quote</button><button className="btn ghost" onClick={() => reply(r.id, false)}>Decline</button></span> : r.quote_status]]} />
    <h3>My support tickets</h3><Table rows={tk.data} empty="No tickets." cols={[['Ticket', r => r.ticket_no], ['Subject', r => r.subject], ['Status', r => r.status], ['Opened', r => fmt(r.created_at)]]} /></div>
}
export function VendorPanel() {
  const rep = useData<Row[]>(() => supabase.rpc('vendor_report')); const st = useData<Row[]>(() => supabase.from('settlements').select('*').order('paid_at', { ascending: false }))
  const it = useData<Row[]>(() => supabase.from('order_items').select('id,title,qty,unit_price,commission_rate').limit(100))
  const r = rep.data?.[0]
  return <div><Err m={rep.err} />{r ? <div className="stats"><Stat l="Gross sales (paid orders)" v={ugx(r.gross)} /><Stat l="YAKU commission" v={ugx(r.commission)} /><Stat l="Your earnings" v={ugx(r.earnings)} /><Stat l="Settled to you" v={ugx(r.settled)} /><Stat l="Balance owed to you" v={ugx(r.balance)} /></div> : <p className="empty">Your vendor store is not active yet.</p>}
    <h3>Settlements</h3><Table rows={st.data} empty="No settlements yet." cols={[['Date', x => fmt(x.paid_at)], ['Amount', x => ugx(x.amount)], ['Reference', x => x.reference]]} />
    <h3>Store assistant</h3><Chat scope="vendor" /><h3>Items sold</h3><Table rows={it.data} empty="No sales yet." cols={[['Item', x => x.title], ['Qty', x => x.qty], ['Unit price', x => ugx(x.unit_price)], ['Commission %', x => x.commission_rate]]} /></div>
}
