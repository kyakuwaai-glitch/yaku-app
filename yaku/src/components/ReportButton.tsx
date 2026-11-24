import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
/** Lets users report objectionable user-generated content. Reports land in the existing support tickets for staff to review. */
export default function ReportButton({ what }: { what: string }) {
  const { session } = useAuth(); const [open, setOpen] = useState(false); const [msg, setMsg] = useState('')
  async function send(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const why = String(new FormData(e.currentTarget).get('why')).trim()
    const { error } = await supabase.from('tickets').insert({ user_id: session!.user.id, email: session!.user.email, category: 'content_report', subject: `Report: ${what}`.slice(0, 120), description: why }); setMsg(error ? error.message : 'Thank you. Our team will review this.'); if (!error) setOpen(false) }
  if (!session) return <p className="note"><Link to="/login">Sign in</Link> to report this listing.</p>
  return <div><button className="link" onClick={() => setOpen(!open)}>Report this listing</button>{open && <form className="cbtn" onSubmit={send}><input name="why" placeholder="What is wrong?" required maxLength={500} /><button className="btn ghost">Send report</button></form>}{msg && <p className="note" role="status">{msg}</p>}</div>
}
