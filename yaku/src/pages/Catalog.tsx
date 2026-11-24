import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase, supabaseReady, Product, ugx, imgUrl } from '../lib/supabase'
import { useDepartments } from '../lib/storefront'
import { AdSlot } from '../components/StoreBanners'
export default function Catalog() {
  const departments = useDepartments(); const { slug } = useParams(); const [sp] = useSearchParams(); const q = sp.get('q') ?? ''
  const dep = departments.find(d => d.slug === slug); const [rows, setRows] = useState<Product[] | null>(null)
  useEffect(() => { setRows(null); if (!supabaseReady) return setRows([])
    let r = supabase.from('products').select('id,title,price_ugx,flash_price_ugx,image_path,kind,department').eq('status', 'published').limit(48)
    if (dep) r = r.eq('department', dep.slug); if (q) r = r.ilike('title', `%${q.replace(/[%,]/g, '')}%`)
    r.then(({ data }) => setRows((data as Product[]) ?? [])) }, [slug, q])
  const title = dep?.name ?? (q ? `Results for “${q}”` : 'All products')
  return <section className="sec"><Helmet><title>{title} | YAKU Uganda</title></Helmet><h1>{title}</h1><AdSlot placement="department" />
    {rows === null ? <p>Loading…</p> : rows.length === 0 ? <p className="empty">Nothing listed here yet. Check back soon.</p> :
      <div className="grid">{rows.map(p => <article className="card" key={p.id}><img loading="lazy" src={imgUrl(p.image_path)} alt="" width="240" height="180" /><h3>{p.title}</h3><p className="price">{ugx(p.flash_price_ugx ?? p.price_ugx)}</p></article>)}</div>}</section>
}
