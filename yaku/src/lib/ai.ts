import { supabase } from './supabase'
/** Calls a Supabase Edge Function. API keys live only on the server; a missing setting is reported, never faked. */
const CK = 'yaku-ai-consent'
export const hasAiConsent = () => { try { return localStorage.getItem(CK) === '1' } catch { return false } }
export const setAiConsent = (v: boolean) => { try { v ? localStorage.setItem(CK, '1') : localStorage.removeItem(CK) } catch { /* storage blocked */ } }
export async function callFn<T = any>(name: string, body: unknown): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase.functions.invoke(name, { body: { ...(body as Record<string, unknown>), consent: hasAiConsent() } })
  if (error) {
    let msg = 'Something went wrong. Please try again.'
    try { const j = await (error as any).context?.json?.(); if (j?.error === 'not_configured') msg = `AI is not set up yet. Missing server setting: ${j.missing.join(', ')}.`; else if (j?.error) msg = j.error } catch { /* keep generic message */ }
    return { error: msg }
  }
  if ((data as any)?.error) return { error: (data as any).error }
  return { data: data as T }
}
export const signed = async (path: string, download = false) => (await supabase.storage.from('artwork').createSignedUrl(path, 600, download ? { download: true } : undefined)).data?.signedUrl ?? ''
