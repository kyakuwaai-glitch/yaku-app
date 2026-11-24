import { useEffect, useState } from 'react'
import { supabase, supabaseReady } from './supabase'
import { defaultSettings } from '../content/pages'
export type Settings = typeof defaultSettings
let cache: Promise<Settings> | null = null
const load = (): Promise<Settings> => (cache ??= supabaseReady
  ? Promise.resolve(supabase.from('site_settings').select('key,value')).then(({ data }) => ({ ...defaultSettings, ...Object.fromEntries((data ?? []).filter((r: any) => r.value).map((r: any) => [r.key, r.value])) }))
  : Promise.resolve(defaultSettings))
export const clearSettingsCache = () => { cache = null }
export function useSettings() { const [s, setS] = useState<Settings>(defaultSettings); useEffect(() => { load().then(setS) }, []); return s }
export const fill = (t: string, s: Settings) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (s as any)[k] || `[${k.replace('_', ' ')} – set in Admin > Settings]`)
export type PageRow = { title: string; description: string | null; body: string; updated_at: string }
export function usePage(slug: string) {
  const [row, setRow] = useState<PageRow | null>(null); const [loading, setLoading] = useState(supabaseReady)
  useEffect(() => { setRow(null); if (!supabaseReady) return setLoading(false); setLoading(true)
    Promise.resolve(supabase.from('pages').select('title,description,body,updated_at').eq('slug', slug).maybeSingle()).then(({ data }) => { setRow(data as PageRow | null); setLoading(false) }) }, [slug])
  return { row, loading }
}
