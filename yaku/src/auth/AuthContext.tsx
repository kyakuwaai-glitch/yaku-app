import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, Role } from '../lib/supabase'
type Profile = { id: string; full_name: string | null; role: Role }
type Ctx = { session: Session | null; profile: Profile | null; loading: boolean; staffRoles: string[]; staffReady: boolean; signOut: () => Promise<void> }
const C = createContext<Ctx>({ session: null, profile: null, loading: true, staffRoles: [], staffReady: false, signOut: async () => {} })
export const useAuth = () => useContext(C)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffRoles, setStaffRoles] = useState<string[]>([]); const [staffReady, setStaffReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setProfile(null); setLoading(false) } })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setStaffRoles([]); setStaffReady(false); return }
    supabase.from('profiles').select('id,full_name,role').eq('id', session.user.id).single()
      .then(({ data }) => { setProfile(data as Profile | null); setLoading(false) })
    Promise.resolve(supabase.rpc('my_staff_roles')).then(({ data }) => { setStaffRoles((data as string[]) ?? []); setStaffReady(true) })
  }, [session])
  const signOut = async () => { await supabase.auth.signOut() }
  return <C.Provider value={{ session, profile, loading, staffRoles, staffReady, signOut }}>{children}</C.Provider>
}
/** Role comes from the database profile; RLS enforces the same rules server-side. */
export function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth(); const loc = useLocation()
  if (loading) return <p className="pad">Loading…</p>
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (roles && (!profile || !roles.includes(profile.role))) return <Navigate to="/404" replace />
  return <>{children}</>
}
