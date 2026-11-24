import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, ugx, Row } from './ui'
const KINDS = ['unit_tier', 'material', 'finish', 'design', 'setup', 'express_pct', 'delivery', 'discount_pct']
export default function Pricing() {
  const [msg, setMsg] = useState(''); const [t, setT] = useState(0); const after = () => setT(x => x + 1)
  const sv = useData<Row[]>(() => supabase.from('print_services').select('*').order('name'), [t]); const pr = useData<Row[]>(() => supabase.from('price_rules').select('*,print_services(name)').order('kind'), [t])
  const us = useData<Row[]>(() => supabase.from('ai_usage').select('*').order('day', { ascending: false }).limit(60), [t])
  const add = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const n = (k: string) => (f.get(k) === '' ? null : Number(f.get(k)))
    run(supabase.from('price_rules').insert({ service_id: f.get('service'), kind: f.get('kind'), name: f.get('name') || '', amount: Number(f.get('amount')), qty_from: n('from'), qty_to: n('to') }), setMsg, 'Rule added.', after) }
  return <div><Err m={sv.err || pr.err || msg} /><p className="note">Prices come only from these rules. No rule means the customer gets a custom quotation. unit_tier = price per item for a quantity range; material/finish = extra per item (name must match); design/setup/delivery = flat UGX; express_pct and discount_pct = percent.</p>
    <form className="cbtn" onSubmit={add}><select name="service" required>{(sv.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><select name="kind">{KINDS.map(k => <option key={k}>{k}</option>)}</select><input name="name" placeholder="Name (material or finish)" /><input name="amount" type="number" min="0" step="0.01" placeholder="Amount" required /><input name="from" type="number" placeholder="Qty from" /><input name="to" type="number" placeholder="Qty to" /><button className="btn">Add rule</button></form>
    <Table rows={pr.data} empty="No pricing rules yet. Every quote is a custom quotation until you add rules." cols={[['Service', r => r.print_services?.name], ['Kind', r => r.kind], ['Name', r => r.name], ['Amount', r => ['express_pct', 'discount_pct'].includes(r.kind) ? `${r.amount}%` : ugx(r.amount)], ['Qty', r => `${r.qty_from ?? ''}–${r.qty_to ?? ''}`], ['Active', r => <button className="link" onClick={() => run(supabase.from('price_rules').update({ active: !r.active }).eq('id', r.id), setMsg, 'Updated.', after)}>{r.active ? 'Yes (turn off)' : 'No (turn on)'}</button>]]} />
    <h3>AI usage (daily)</h3><Table rows={us.data?.map(u => ({ ...u, id: u.key + u.day })) ?? null} empty="No AI usage yet." cols={[['Day', r => r.day], ['User / visitor', r => String(r.key).slice(0, 12)], ['Chats', r => r.requests], ['Images', r => r.images], ['Tokens in', r => r.input_tokens], ['Tokens out', r => r.output_tokens]]} /></div>
}
