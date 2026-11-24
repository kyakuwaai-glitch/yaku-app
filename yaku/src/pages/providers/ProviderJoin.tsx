import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import ProviderProfileForm from '../../components/ProviderProfileForm'
export default function ProviderJoin() {
  const { session, loading } = useAuth(); const [has, setHas] = useState<boolean | null>(null)
  useEffect(() => { if (session) Promise.resolve(supabase.from('providers').select('id').eq('owner_id', session.user.id).maybeSingle()).then(({ data }) => setHas(!!data)) }, [session])
  if (loading) return <p className="pad">Loading…</p>
  if (has) return <Navigate to="/provider" replace />
  return <section className="form"><Helmet><title>Become a service provider | YAKU Uganda</title></Helmet><h1>Become a service provider</h1>
    <p>Offer services such as rubber stamps, embroidery, printing, signs, engraving, photography or tailoring to YAKU customers. YAKU reviews every provider before it is listed.</p>
    {!session ? <p className="empty">Use your YAKU account to continue. <Link to="/login">Sign in</Link> or <Link to="/register">create an account</Link>, then return to this page.</p> : <ProviderProfileForm uid={session.user.id} onSaved={() => setHas(true)} />}</section>
}
