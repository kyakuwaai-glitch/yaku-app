import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase, supabaseReady } from '../lib/supabase'
/** Staff and admin sign-in. Credentials are checked by Supabase Auth; no password is stored in this code. */
export default function StaffLogin() {
  const nav = useNavigate(); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabaseReady) return setMsg('Supabase is not configured. Add your keys to .env.')
    setBusy(true); setMsg(''); const f = new FormData(e.currentTarget)
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) })
    if (error) { setBusy(false); return setMsg('Sign-in failed. Check your details.') }
    const { data } = await supabase.rpc('my_staff_roles')
    if (!(data as string[] | null)?.length) { await supabase.auth.signOut(); setBusy(false); return setMsg('This account does not have staff access.') }
    nav('/console')
  }
  return <section className="form"><Helmet><title>Staff sign-in | YAKU</title><meta name="robots" content="noindex" /></Helmet><h1>Staff sign-in</h1>
    <form onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="username" /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
      <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>{msg && <p role="alert" className="msg">{msg}</p>}</form></section>
}
