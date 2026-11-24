import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import Chat from '../components/Chat'
type Row = Record<string, any>
export default function AiPage() {
  const { session, profile, staffRoles } = useAuth(); const [scope, setScope] = useState<'customer' | 'vendor' | 'admin'>('customer'); const [hist, setHist] = useState<Row[]>([]); const [open, setOpen] = useState<{ id: string | null; msgs: any[] }>({ id: null, msgs: [] }); const [k, setK] = useState(0)
  useEffect(() => { if (session) Promise.resolve(supabase.from('ai_conversations').select('id,title,scope,created_at').order('created_at', { ascending: false }).limit(30)).then(({ data }) => setHist(data ?? [])) }, [session, k])
  const load = async (id: string) => { const { data } = await supabase.from('ai_messages').select('role,content').eq('conversation_id', id).in('role', ['user', 'assistant']).order('created_at'); setOpen({ id, msgs: data ?? [] }); setK(x => x + 1) }
  return <div className="sec aipage"><Helmet><title>YAKU AI assistant | YAKU Uganda</title></Helmet><h1>YAKU AI</h1>
    <p>Ask about products, printing prices, orders and how YAKU works. <Link to="/studio/print">Print Studio</Link> · <Link to="/studio/design">Design Studio</Link></p>
    {(profile?.role === 'vendor' || staffRoles.length > 0) && <label>Assistant <select value={scope} onChange={e => { setScope(e.target.value as any); setOpen({ id: null, msgs: [] }) }}><option value="customer">Customer</option>{profile?.role === 'vendor' && <option value="vendor">Vendor</option>}{staffRoles.length > 0 && <option value="admin">Staff</option>}</select></label>}
    <div className="aigrid"><aside><h3>History</h3>{!session ? <p className="note"><Link to="/login">Sign in</Link> to save conversations.</p> : hist.length === 0 ? <p className="note">No conversations yet.</p> : hist.map(h => <button key={h.id} className="link block" onClick={() => load(h.id)}>{h.title ?? 'Conversation'}</button>)}
      <button className="link block" onClick={() => { setOpen({ id: null, msgs: [] }); setK(x => x + 1) }}>+ New conversation</button></aside>
      <Chat key={`${scope}-${open.id}-${k}`} scope={scope} initial={open.msgs} cid={open.id} /></div></div>
}
