import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, fmt, Row } from './ui'
const ROLES = ['super_admin', 'store_manager', 'order_manager', 'finance_manager', 'vendor_manager', 'support', 'printing_manager']
export default function Staff() {
  const [msg, setMsg] = useState(''); const [n, setN] = useState(0); const after = () => setN(x => x + 1)
  const st = useData<Row[]>(() => supabase.rpc('staff_overview'), [n]); const au = useData<Row[]>(() => supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200), [n])
  const grant = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.rpc('grant_role', { p_email: f.get('email'), p_role: f.get('role') }), setMsg, 'Role granted.', after) }
  return <div><Err m={st.err || au.err || msg} /><h3>Staff roles</h3>
    <form className="cbtn" onSubmit={grant}><input name="email" type="email" placeholder="Account email (must be registered)" required /><select name="role">{ROLES.map(r => <option key={r}>{r}</option>)}</select><button className="btn">Grant role</button></form>
    <Table rows={(st.data ?? []).flatMap(s => s.roles.map((r: string) => ({ ...s, id: s.user_id + r, role: r })))} empty="No staff roles granted yet. Platform admins are super admins automatically." cols={[['Name', r => r.full_name], ['Email', r => r.email], ['Role', r => r.role], ['', r => <button className="btn ghost" onClick={() => run(supabase.rpc('revoke_role', { p_user: r.user_id, p_role: r.role }), setMsg, 'Role removed.', after)}>Remove</button>]]} />
    <h3>Audit log (latest 200)</h3><Table rows={au.data} empty="Nothing logged yet." cols={[['When', r => fmt(r.created_at)], ['Who', r => r.actor_email ?? r.actor ?? 'system'], ['Action', r => r.action], ['Record', r => `${r.entity} ${r.entity_id ?? ''}`]]} /></div>
}
