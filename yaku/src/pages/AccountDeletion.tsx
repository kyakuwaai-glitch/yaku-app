import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { callFn } from '../lib/ai'
/** Public page: this is the "data deletion" URL for the store listings. Deletion itself needs a signed-in user. */
export default function AccountDeletion() {
  const { session } = useAuth(); const nav = useNavigate(); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [blockers, setB] = useState<string[]>([])
  async function del(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setMsg(''); setB([])
    const { data, error } = await callFn<{ status: string; blockers?: string[] }>('delete-account', { confirm: String(f.get('confirm')).trim() }); setBusy(false)
    if (error) return setMsg(error); if (data?.status === 'needs_review') return setB(data.blockers ?? [])
    await supabase.auth.signOut(); nav('/', { replace: true }) }
  return <section className="form"><Helmet><title>Delete your account | YAKU Uganda</title><meta name="robots" content="noindex" /></Helmet><h1>Delete your YAKU account</h1>
    <h3>What is deleted</h3><ul><li>Your profile and sign-in details</li><li>Saved YAKU AI conversations and files you attached</li><li>Artwork and designs you uploaded or generated</li><li>Your provider profile, portfolio and services, if you have no job records</li></ul>
    <h3>What is kept</h3><p>Order, payment and job records that YAKU must keep for accounting and legal reasons stay, with your name, phone, email and address removed.</p>
    {!session ? <p className="empty">To delete your account, <Link to="/login">sign in</Link> and return to this page. You can also <Link to="/info/contact">contact support</Link> to ask for deletion.</p> :
      <form className="sform" onSubmit={del}><label>Type DELETE to confirm<input name="confirm" required autoComplete="off" /></label><button className="btn" disabled={busy}>{busy ? 'Deleting…' : 'Permanently delete my account'}</button>
        {msg && <p role="alert" className="msg">{msg}</p>}
        {blockers.length > 0 && <div className="msg" role="status"><b>We could not delete it yet:</b><ul>{blockers.map(b => <li key={b}>{b}</li>)}</ul><p>We have recorded your request and a YAKU team member will finish it once these are resolved.</p></div>}</form>}</section>
}
