import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useDepartments } from '../../lib/storefront'
import { useData, Err, Table, run, fmt, ugx, Row } from './ui'
export default function Inventory() {
  const departments = useDepartments()
  const [msg, setMsg] = useState(''); const [sel, setSel] = useState('')
  const { data, err, reload } = useData<Row[]>(() => supabase.from('products').select('*').order('title').limit(300))
  const mv = useData<Row[]>(() => supabase.from('stock_movements').select('*').eq('product_id', sel || '00000000-0000-0000-0000-000000000000').order('created_at', { ascending: false }).limit(50), [sel, data])
  const p = data?.find(x => x.id === sel); const low = (data ?? []).filter(x => x.stock <= x.low_stock_threshold)
  const num = (v: FormDataEntryValue | null) => (v === null || v === '' ? null : Number(v))
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget)
    const { data: row, error } = await supabase.from('products').insert({ title: f.get('title'), department: f.get('dept'), kind: f.get('kind'), price_ugx: num(f.get('price')), cost_ugx: num(f.get('cost')), low_stock_threshold: num(f.get('thr')) ?? 5, status: f.get('publish') ? 'published' : 'draft' }).select('id').single()
    if (error) return setMsg(error.message); const n = num(f.get('stock'))
    if (n) { const r = await supabase.from('stock_movements').insert({ product_id: row.id, change: n, reason: 'restock', note: 'Opening stock' }); if (r.error) return setMsg(r.error.message) }
    setMsg('Product added.'); reload() }
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('products').update({ price_ugx: num(f.get('price')), cost_ugx: num(f.get('cost')), low_stock_threshold: num(f.get('thr')) ?? 5, status: f.get('status') }).eq('id', sel), setMsg, 'Saved.', reload) }
  const adjust = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('stock_movements').insert({ product_id: sel, change: Number(f.get('change')), reason: f.get('reason'), note: f.get('note') || null }), setMsg, 'Stock updated.', reload) }
  return <div>{low.length > 0 && <p className="msg low">Low stock: {low.map(x => `${x.title} (${x.stock})`).join(', ')}</p>}<Err m={err || msg} />
    <form className="sform" onSubmit={add}><h3>Add product</h3><div className="cbtn"><input name="title" placeholder="Title" required /><select name="dept">{departments.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select><select name="kind"><option value="product">Product</option><option value="service">Service</option></select>
      <input name="price" type="number" min="0" placeholder="Price UGX" /><input name="cost" type="number" min="0" placeholder="Cost UGX" /><input name="stock" type="number" min="0" placeholder="Opening stock" /><input name="thr" type="number" min="0" placeholder="Low-stock level (5)" /><label><input name="publish" type="checkbox" /> Publish</label><button className="btn">Add</button></div></form>
    <Table rows={data} cols={[['Product', r => <button className="link" onClick={() => setSel(r.id)}>{r.title}</button>], ['Dept', r => r.department], ['Stock', r => <span className={r.stock <= r.low_stock_threshold ? 'low' : ''}>{r.stock}</span>], ['Price', r => ugx(r.price_ugx)], ['Cost', r => r.cost_ugx == null ? '–' : ugx(r.cost_ugx)], ['Margin', r => r.price_ugx && r.cost_ugx != null ? `${Math.round((1 - r.cost_ugx / r.price_ugx) * 100)}%` : '–'], ['Status', r => r.status]]} />
    {p && <section className="card sub"><h3>{p.title}</h3>
      <form className="cbtn" onSubmit={save}><input name="price" type="number" defaultValue={p.price_ugx ?? ''} placeholder="Price" /><input name="cost" type="number" defaultValue={p.cost_ugx ?? ''} placeholder="Cost" /><input name="thr" type="number" defaultValue={p.low_stock_threshold} /><select name="status" defaultValue={p.status}><option>draft</option><option>pending</option><option>published</option></select><button className="btn">Save</button></form>
      <form className="cbtn" onSubmit={adjust}><input name="change" type="number" placeholder="+10 or -2" required /><select name="reason">{['restock', 'adjustment', 'return', 'damage', 'sale'].map(r => <option key={r}>{r}</option>)}</select><input name="note" placeholder="Note" /><button className="btn">Update stock</button></form>
      <h4>Stock movement</h4><Table rows={mv.data} empty="No movements yet." cols={[['When', r => fmt(r.created_at)], ['Change', r => r.change], ['Reason', r => r.reason], ['Note', r => r.note ?? '']]} /></section>}</div>
}
