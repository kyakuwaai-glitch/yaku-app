import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
export const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
export const env = (k: string) => Deno.env.get(k) ?? ''
export const missing = (keys: string[]) => keys.filter(k => !env(k))
export function clients(req: Request) {
  const auth = req.headers.get('Authorization') ?? ''
  return { user: createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } } }), admin: createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY')) }
}
export async function whoami(user: SupabaseClient) { const { data } = await user.auth.getUser(); return data.user ?? null }
export async function hash(s: string) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('') }
/** Daily quota per user (or per hashed IP). Returns false when the limit is reached. */
export async function useQuota(admin: SupabaseClient, key: string, field: 'requests' | 'images', max: number) {
  const day = new Date().toISOString().slice(0, 10)
  const { data } = await admin.from('ai_usage').select('*').eq('key', key).eq('day', day).maybeSingle()
  if ((data?.[field] ?? 0) >= max) return false
  await admin.from('ai_usage').upsert({ key, day, requests: data?.requests ?? 0, images: data?.images ?? 0, input_tokens: data?.input_tokens ?? 0, output_tokens: data?.output_tokens ?? 0, [field]: (data?.[field] ?? 0) + 1 })
  return true
}
export async function openai(path: string, body: unknown) {
  const r = await fetch('https://api.openai.com/v1/' + path, { method: 'POST', headers: { Authorization: `Bearer ${env('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message ?? `AI provider error ${r.status}`); return j
}
export const notConfigured = (keys: string[]) => { const m = missing(keys); return m.length ? json({ error: 'not_configured', missing: m }, 503) : null }
