import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useData, Err, fmt, run, Row } from './ui'
export default function Alerts() {
  const [n, setN] = useState(0); const [msg, setMsg] = useState('')
  const a = useData<Row[]>(() => supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100), [n]); const r = useData<Row[]>(() => supabase.from('notification_reads').select('notification_id'), [n])
  const read = new Set((r.data ?? []).map(x => x.notification_id)); const unread = (a.data ?? []).filter(x => !read.has(x.id))
  const mark = (ids: string[]) => run(supabase.from('notification_reads').upsert(ids.map(id => ({ notification_id: id }))), setMsg, 'Marked as read.', () => setN(x => x + 1))
  return <div><Err m={a.err || msg} /><p><b>{unread.length}</b> unread {unread.length > 0 && <button className="btn ghost" onClick={() => mark(unread.map(x => x.id))}>Mark all read</button>}</p>
    {a.data?.length === 0 && <p className="empty">No alerts yet.</p>}
    {a.data?.map(x => <div key={x.id} className={`card sub ${read.has(x.id) ? '' : 'unread'}`}><b>{x.title}</b> <small>{fmt(x.created_at)}</small><br />{x.body}{!read.has(x.id) && <> <button className="link" onClick={() => mark([x.id])}>Mark read</button></>}</div>)}</div>
}
