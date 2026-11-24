import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Stat, Table, Period, range, run, fmt, ugx, Row } from './ui'
export default function Finance() {
  const [p, setP] = useState('monthly'); const [f, t] = range(p); const [msg, setMsg] = useState(''); const [n, setN] = useState(0)
  const { data: d, err } = useData<Row>(() => supabase.rpc('finance_summary', { p_from: f, p_to: t }), [p, n])
  const ex = useData<Row[]>(() => supabase.from('expenses').select('*').order('spent_on', { ascending: false }).limit(50), [n])
  const pm = useData<Row[]>(() => supabase.from('payments').select('*,orders(order_no)').order('created_at', { ascending: false }).limit(50), [n])
  const add = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const x = new FormData(e.currentTarget); run(supabase.from('expenses').insert({ category: x.get('cat'), description: x.get('desc') || null, amount: Number(x.get('amount')), spent_on: x.get('date') || undefined }), setMsg, 'Expense recorded.', () => setN(v => v + 1)) }
  return <div><Period v={p} set={setP} /><Err m={err || msg} />{d && <>
    <h3>Marketplace sales (not YAKU's earnings)</h3><div className="stats"><Stat l="YAKU direct sales" v={ugx(d.direct_sales)} /><Stat l="Vendor sales" v={ugx(d.vendor_sales)} /><Stat l="Designer sales" v={ugx(d.designer_sales)} /></div>
    <h3>YAKU income</h3><div className="stats"><Stat l="Direct sales" v={ugx(d.direct_sales)} /><Stat l="Printing revenue" v={ugx(d.printing_revenue)} /><Stat l="Vendor commissions" v={ugx(d.vendor_commission)} /><Stat l="Designer commissions" v={ugx(d.designer_commission)} /><Stat l="Total YAKU revenue" v={ugx(d.yaku_revenue)} /></div>
    <h3>Deductions</h3><div className="stats"><Stat l="Cost of goods sold" v={ugx(d.cogs)} /><Stat l="Payment gateway charges" v={ugx(d.gateway_fees)} /><Stat l="Refunds" v={ugx(d.refunds)} /><Stat l="Operating expenses" v={ugx(d.expenses)} /></div>
    <div className="stats"><Stat l="Actual business profit" v={ugx(d.profit)} /><Stat l="Vendor settlements paid (not an expense)" v={ugx(d.settlements)} /></div>
    <p className="note">Profit = YAKU revenue − cost of goods − gateway charges − refunds − operating expenses. Vendor sales are excluded from revenue except YAKU's commission. Refunds are deducted in full; adjust if a vendor bears one.</p></>}
    <h3>Operating expenses</h3><form className="cbtn" onSubmit={add}><input name="cat" placeholder="Category (rent, salaries…)" required /><input name="desc" placeholder="Description" /><input name="amount" type="number" min="1" placeholder="Amount UGX" required /><input name="date" type="date" /><button className="btn">Add expense</button></form>
    <Table rows={ex.data} empty="No expenses recorded." cols={[['Date', r => r.spent_on], ['Category', r => r.category], ['Description', r => r.description ?? ''], ['Amount', r => ugx(r.amount)]]} />
    <h3>Recent payments</h3><Table rows={pm.data} empty="No payments recorded." cols={[['Date', r => fmt(r.created_at)], ['Order', r => r.orders?.order_no], ['Provider', r => r.provider], ['Reference', r => r.provider_ref], ['Amount', r => ugx(r.amount)], ['Fee', r => ugx(r.gateway_fee)], ['Outcome', r => r.status]]} /></div>
}
