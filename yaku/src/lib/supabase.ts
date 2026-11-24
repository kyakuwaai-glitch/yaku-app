import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseReady = Boolean(url && key)
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing')
export const departments = [
  { slug: 't-shirts', name: 'T-shirts' },
  { slug: 'mugs', name: 'Mugs' },
  { slug: 'magic-cups', name: 'Magic Cup' },
  { slug: 'boards', name: 'Boards' },
  { slug: 'frames', name: 'Frames' },
  { slug: 'toner-products', name: 'Toner Products' },
  { slug: 'stationery-office-supplies', name: 'Stationery & Office Supplies' },
  { slug: 'printers-photocopiers', name: 'Printers & Photocopiers' },
  { slug: 'printing-materials', name: 'Printing Materials & Consumables' },
  { slug: 'printing-services', name: 'Printing Services' },
  { slug: 'branding-promotional', name: 'Branding & Promotional Products' },
  { slug: 'office-equipment', name: 'Office Equipment' },
]
export type Role = 'customer' | 'vendor' | 'designer' | 'admin'
export type Product = { id: string; title: string; price_ugx: number | null; flash_price_ugx: number | null; image_path: string | null; kind: string; department: string }
export const ugx = (n: number | null) => (n == null ? 'Request quote' : `UGX ${n.toLocaleString()}`)
export const imgUrl = (p: string | null) => (p ? supabase.storage.from('store-media').getPublicUrl(p).data.publicUrl : '/logo.webp')
