import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Stat, Period, range, ugx, Row } from './ui'
export default function Overview() {
  const [p, setP] = useState('monthly'); const [f, t] = range(p)
  const { data: d, err } = useData<Row>(() => supabase.rpc('dashboard_summary', { p_from: f, p_to: t }), [p])
  return <div><Period v={p} set={setP} /><Err m={err} />{d && <div className="stats">
    <Stat l="Total sales (all paid orders)" v={ugx(d.total_sales)} /><Stat l="Total orders" v={d.total_orders} /><Stat l="Total customers" v={d.customers} />
    <Stat l="Approved vendors" v={d.vendors} /><Stat l="Approved designers" v={d.designers} /><Stat l="Pending payments" v={`${d.pending_payments} (${ugx(d.pending_payments_amount)})`} />
    <Stat l="Completed orders" v={d.completed_orders} /><Stat l="Pending deliveries" v={d.pending_deliveries} /><Stat l="Open printing requests" v={d.printing_open} />
    <Stat l="Commissions earned" v={ugx(Number(d.vendor_commission) + Number(d.designer_commission))} /><Stat l="YAKU revenue" v={ugx(d.yaku_revenue)} />
    <Stat l="Expenses and costs" v={ugx(d.costs)} /><Stat l="Business profit" v={ugx(d.profit)} /></div>}
    <p className="note">Total sales is everything customers paid, including vendors' share. YAKU's own earnings are revenue and profit; see Finance for the breakdown.</p></div>
}
