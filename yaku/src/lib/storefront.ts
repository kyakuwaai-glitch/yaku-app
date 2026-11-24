import { useEffect, useState } from 'react'
import { supabase, supabaseReady, departments as defaultDepartments } from './supabase'
export type Banner = { id: string; placement: string; title: string; subtitle: string | null; button_text: string | null; link_url: string | null; image_path: string | null; sort_order: number; active: boolean; starts_at: string | null; ends_at: string | null }
export type Dept = { slug: string; name: string }
export type HomeSection = { key: string; title: string; visible: boolean; sort_order: number }
const cache: Record<string, Promise<any>> = {}
const once = (k: string, f: () => PromiseLike<any>) => (cache[k] ??= Promise.resolve(f()))
export const clearStorefrontCache = () => { for (const k of Object.keys(cache)) delete cache[k] }
export const bannerImg = (p: string) => supabase.storage.from('store-media').getPublicUrl(p).data.publicUrl
const live = (b: Banner) => b.active && (!b.starts_at || new Date(b.starts_at) <= new Date()) && (!b.ends_at || new Date(b.ends_at) > new Date())
/** Departments come from the database; the built-in list is used until the table exists or is empty. */
export function useDepartments(): Dept[] {
  const [d, setD] = useState<Dept[]>(defaultDepartments)
  useEffect(() => { if (supabaseReady) once('depts', () => supabase.from('departments').select('slug,name').eq('active', true).order('sort_order')).then((r: any) => { if (r.data?.length) setD(r.data) }) }, [])
  return d
}
export function useBanners(placement: string): Banner[] {
  const [l, setL] = useState<Banner[]>([])
  useEffect(() => { if (supabaseReady) once('banners', () => supabase.from('banners').select('*').order('sort_order')).then((r: any) => setL(((r.data ?? []) as Banner[]).filter(b => b.placement === placement && live(b)))) }, [placement])
  return l
}
export function useHomeSections(): Record<string, HomeSection> {
  const [m, setM] = useState<Record<string, HomeSection>>({})
  useEffect(() => { if (supabaseReady) once('home', () => supabase.from('home_sections').select('*')).then((r: any) => setM(Object.fromEntries((r.data ?? []).map((s: HomeSection) => [s.key, s])))) }, [])
  return m
}
