import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Stat, Table, Period, range, fmt, ugx, Row } from './ui'
const csvCell = (v: unknown) => { const s = String(v ?? ''); return /^[=+\-@]/.test(s) ? `'${s}` : s }  // blocks spreadsheet formula injection
const toCsv = (rows: Row[][]) => rows.map(r => r.map(c => `"${csvCell(c).replace(/"/g, '""')}"`).join(',')).join('\n')
export default function Reports() {
  const [p, setP] = useState('daily'); const [f, t] = range(p)
  const s = useData<Row>(() => supabase.rpc('dashboard_summary', { p_from: f, p_to: t }), [p])
  const o = useData<Row[]>(() => supabase.from('orders').select('order_no,created_at,customer_name,status,payment_status,delivery_status,total').gte('created_at', f).lt('created_at', t).order('created_at'), [p])
  const d = s.data
  const labels: [string, string][] = [['Total sales', 'total_sales'], ['Orders', 'total_orders'], ['Completed orders', 'completed_orders'], ['YAKU revenue', 'yaku_revenue'], ['Costs', 'costs'], ['Profit', 'profit'], ['Vendor sales', 'vendor_sales'], ['Direct sales', 'direct_sales'], ['Printing revenue', 'printing_revenue'], ['Gateway fees', 'gateway_fees'], ['Refunds', 'refunds'], ['Expenses', 'expenses']]
  const csv = () => { if (!d) return; const body = [['Report', p], ['From', f], ['To', t], [], ...labels.map(([l, k]) => [l, d[k]]), [], ['Order', 'Date', 'Customer', 'Status', 'Payment', 'Delivery', 'Total'], ...(o.data ?? []).map(r => [r.order_no, r.created_at, r.customer_name, r.status, r.payment_status, r.delivery_status, r.total])]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toCsv(body)], { type: 'text/csv' })); a.download = `yaku-${p}-report.csv`; a.click(); URL.revokeObjectURL(a.href) }
  return <div className="printable"><div className="cbtn noprint"><Period v={p} set={setP} /><button className="btn" onClick={csv} disabled={!d}>Download CSV</button><button className="btn ghost" onClick={() => window.print()}>Save as PDF</button></div>
    <h2>YAKU {p} report</h2><p>{fmt(f)} to {fmt(t)}</p><Err m={s.err || o.err} />
    {d && <div className="stats">{labels.map(([l, k]) => <Stat key={k} l={l} v={['total_orders', 'completed_orders'].includes(k) ? d[k] : ugx(d[k])} />)}</div>}
    <h3>Orders in this period</h3><Table rows={o.data} empty="No orders in this period." cols={[['Order', r => r.order_no], ['Date', r => fmt(r.created_at)], ['Customer', r => r.customer_name], ['Status', r => r.status], ['Payment', r => r.payment_status], ['Total', r => ugx(r.total)]]} />
    <p className="note noprint">"Save as PDF" opens your browser's print dialog; choose "Save as PDF" as the destination.</p></div>
}
