import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, supabaseReady } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { isNative } from '../lib/native'
export default function Auth({ mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' | 'profile' }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const nav = useNavigate(); const { profile, session } = useAuth()
  const titles = { login: 'Sign in', register: 'Create your account', forgot: 'Reset password', reset: 'Choose a new password', profile: 'Your profile' }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabaseReady) return setMsg('Supabase is not configured. Add your keys to .env.'); setBusy(true); setMsg('')
    const f = new FormData(e.currentTarget); const email = String(f.get('email') ?? ''), password = String(f.get('password') ?? '')
    let error: { message: string } | null = null
    if (mode === 'login') { ({ error } = await supabase.auth.signInWithPassword({ email, password })); if (!error) nav('/dashboard') }
    if (mode === 'register') { ({ error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + '/login', data: { full_name: f.get('name'), requested_role: f.get('role') } } })); if (!error) setMsg('Check your email to confirm your account. Vendor and designer accounts need YAKU approval.') }
    if (mode === 'forgot') { ({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset-password' })); if (!error) setMsg('If that email has an account, a reset link is on its way.') }
    if (mode === 'reset') { ({ error } = await supabase.auth.updateUser({ password })); if (!error) nav('/login') }
    if (mode === 'profile') { ({ error } = await supabase.from('profiles').update({ full_name: f.get('name'), phone: f.get('phone') }).eq('id', session!.user.id)); if (!error) setMsg('Profile saved.') }
    if (error) setMsg(error.message); setBusy(false)
  }
  // Real OAuth call. Enable the Google provider in Supabase; no success is simulated.
  const google = async () => { if (!supabaseReady) return setMsg('Supabase is not configured.'); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/dashboard' } }); if (error) setMsg(error.message) }
  return <section className="form"><h1>{titles[mode]}</h1><form onSubmit={submit}>
    {(mode === 'register' || mode === 'profile') && <label>Full name<input name="name" required defaultValue={profile?.full_name ?? ''} /></label>}
    {mode === 'profile' && <label>Phone<input name="phone" type="tel" /></label>}
    {(mode === 'login' || mode === 'register' || mode === 'forgot') && <label>Email<input name="email" type="email" required autoComplete="email" /></label>}
    {(mode === 'login' || mode === 'register' || mode === 'reset') && <label>Password<input name="password" type="password" minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
    {mode === 'register' && <label>I want to<select name="role"><option value="customer">Shop on YAKU</option><option value="vendor">Sell as a vendor</option><option value="designer">Offer design services</option></select></label>}
    {mode === 'register' && <label><span><input type="checkbox" name="terms" required /> I agree to the <Link to="/info/terms">Terms</Link> and <Link to="/info/privacy">Privacy Policy</Link></span></label>}
    <button className="btn" disabled={busy}>{mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save password' : 'Save changes'}</button>
    {(mode === 'login' || mode === 'register') && !isNative() && <button type="button" className="btn ghost" onClick={google}>Continue with Google</button>}
    {msg && <p role="status" className="msg">{msg}</p>}
    {mode === 'login' && <p><Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link></p>}
    {mode === 'register' && <p>Already registered? <Link to="/login">Sign in</Link></p>}
    {mode === 'profile' && <p><Link to="/account/delete">Delete my account</Link></p>}
  </form></section>
}
