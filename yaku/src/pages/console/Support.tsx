import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, Table, run, fmt, openFile, Row } from './ui'
export default function Support() {
  const [msg, setMsg] = useState(''); const [sel, setSel] = useState(''); const [st, setSt] = useState('')
  const { data, err, reload } = useData<Row[]>(() => { let q: any = supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(100); if (st) q = q.eq('status', st); return q }, [st])
  const staff = useData<Row[]>(() => supabase.rpc('staff_directory'))
  const ev = useData<Row[]>(() => supabase.from('ticket_events').select('*').eq('ticket_id', sel || '00000000-0000-0000-0000-000000000000').order('created_at', { ascending: false }), [sel, data])
  const t = data?.find(x => x.id === sel)
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(supabase.from('tickets').update({ status: f.get('status'), assigned_to: f.get('assignee') || null, resolution: f.get('res') || null }).eq('id', sel), setMsg, 'Ticket updated.', reload) }
  const note = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; run(supabase.from('ticket_events').insert({ ticket_id: sel, kind: 'note', body: new FormData(form).get('body') }), setMsg, 'Note added.', () => { form.reset(); reload() }) }
  return <div><select value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option>{['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s}>{s}</option>)}</select><Err m={err || msg} />
    <Table rows={data} empty="No tickets yet. Contact, dispute, return and report forms create tickets automatically." cols={[['Ticket', r => <button className="link" onClick={() => setSel(r.id)}>{r.ticket_no}</button>], ['Customer', r => r.name ?? r.email], ['Category', r => r.category], ['Subject', r => r.subject], ['Status', r => r.status], ['Opened', r => fmt(r.created_at)]]} />
    {t && <section className="card sub"><h3>{t.ticket_no}: {t.subject}</h3><p>{t.name} · {t.email} · {t.phone ?? '–'}</p><p>{t.description}</p>
      <p>Attachments: {t.attachments?.length ? t.attachments.map((p: string) => <button key={p} className="link" onClick={() => openFile(p)}>{p.split('/').pop()}</button>) : 'none'}</p>
      <form className="sform" onSubmit={save}><div className="cbtn"><select name="status" defaultValue={t.status}>{['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s}>{s}</option>)}</select>
        <select name="assignee" defaultValue={t.assigned_to ?? ''}><option value="">Unassigned</option>{(staff.data ?? []).map(s => <option key={s.user_id} value={s.user_id}>{s.full_name ?? s.user_id.slice(0, 6)}</option>)}</select></div>
        <textarea name="res" rows={2} placeholder="Resolution (recorded when status changes)" defaultValue={t.resolution ?? ''} /><button className="btn">Save ticket</button></form>
      <form className="cbtn" onSubmit={note}><input name="body" placeholder="Add an internal note" required /><button className="btn ghost">Add note</button></form>
      <h4>History</h4><Table rows={ev.data} cols={[['When', r => fmt(r.created_at)], ['Type', r => r.kind], ['Detail', r => r.body]]} /></section>}</div>
}
