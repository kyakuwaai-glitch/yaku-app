import { supabase } from './supabase'
export const ZERO = '00000000-0000-0000-0000-000000000000'
export const mediaUrl = (p?: string | null) => (p ? supabase.storage.from('provider-media').getPublicUrl(p).data.publicUrl : '')
export async function uploadImage(uid: string, f: File): Promise<{ path?: string; error?: string }> {
  if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return { error: 'Please choose a PNG, JPG or WebP image.' }
  if (f.size > 5 * 1024 * 1024) return { error: 'Images must be under 5 MB.' }
  const path = `${uid}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, '_')}`
  const { error } = await supabase.storage.from('provider-media').upload(path, f, { contentType: f.type }); return error ? { error: error.message } : { path }
}
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6)
export const priceText = (t: string, n: number | null) => (t === 'quote' || n == null ? 'Quote on request' : `${t === 'from' ? 'From ' : ''}UGX ${n.toLocaleString()}`)
