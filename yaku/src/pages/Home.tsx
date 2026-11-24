import { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase, supabaseReady, Product, ugx, imgUrl } from '../lib/supabase'
import { useDepartments, useHomeSections } from '../lib/storefront'
import { HeroBanner, PromoBanners, AdSlot } from '../components/StoreBanners'
function useRows<T>(table: string, cols: string, f?: (q: any) => any) {
  const [rows, setRows] = useState<T[] | null>(null)
  useEffect(() => { if (!supabaseReady) { setRows([]); return }
    let q: any = supabase.from(table).select(cols).limit(8); if (f) q = f(q)
    q.then(({ data }: { data: T[] | null }) => setRows(data ?? [])) }, [])
  return rows
}
const Empty = ({ what }: { what: string }) => <p className="empty">No {what} yet. They appear here as soon as they are published.</p>
function Products({ title, rows, to }: { title: string; rows: Product[] | null; to?: string }) {
  return <section className="sec"><div className="sh"><h2>{title}</h2>{to && <Link to={to}>See all</Link>}</div>
    {rows === null ? <p className="empty">Loading…</p> : rows.length === 0 ? <Empty what="items" /> :
      <div className="grid">{rows.map(p => <article className="card" key={p.id}><img loading="lazy" src={imgUrl(p.image_path)} alt="" width="240" height="180" /><h3>{p.title}</h3><p className="price">{ugx(p.flash_price_ugx ?? p.price_ugx)}{p.flash_price_ugx && p.price_ugx ? <s>{ugx(p.price_ugx)}</s> : null}</p></article>)}</div>}</section>
}
export const HOME_KEYS = ['categories', 'popular', 'services', 'flash', 'recommended', 'vendors', 'designers', 'promos']
export default function Home() {
  const cols = 'id,title,price_ugx,flash_price_ugx,image_path,kind,department'
  const popular = useRows<Product>('products', cols, q => q.eq('status', 'published').eq('kind', 'product').order('created_at', { ascending: false }))
  const services = useRows<Product>('products', cols, q => q.eq('status', 'published').eq('kind', 'service'))
  const flash = useRows<Product>('products', cols, q => q.eq('status', 'published').not('flash_price_ugx', 'is', null))
  const rec = useRows<Product>('products', cols, q => q.eq('status', 'published').limit(4))
  const vendors = useRows<{ id: string; name: string }>('vendors', 'id,name', q => q.eq('approved', true))
  const designers = useRows<{ id: string; name: string; specialty: string | null }>('designers', 'id,name,specialty', q => q.eq('approved', true))
  const departments = useDepartments(); const secs = useHomeSections(); const T = (k: string, d: string) => secs[k]?.title || d
  const blocks: Record<string, ReactNode> = {
    categories: <section className="sec" key="categories"><div className="sh"><h2>{T('categories', 'Shop by category')}</h2></div><div className="cats">{departments.map(d => <Link key={d.slug} to={`/department/${d.slug}`}>{d.name}</Link>)}</div></section>,
    popular: <Products key="popular" title={T('popular', 'Popular products')} rows={popular} to="/search?q=a" />,
    services: <Products key="services" title={T('services', 'Printing & branding services')} rows={services} to="/department/printing-services" />,
    flash: <section className="flash" key="flash"><Products title={T('flash', 'Flash deals')} rows={flash} to="/info/flash-sales" /></section>,
    recommended: <Products key="recommended" title={T('recommended', 'Recommended for you')} rows={rec} to="/search?q=a" />,
    vendors: <section className="sec" key="vendors"><div className="sh"><h2>{T('vendors', 'Featured vendors')}</h2><Link to="/info/sell">Become a vendor</Link></div>
      {vendors === null ? null : vendors.length === 0 ? <Empty what="vendors" /> : <div className="pills">{vendors.map(v => <span key={v.id}>{v.name}</span>)}</div>}</section>,
    designers: <section className="sec" key="designers"><div className="sh"><h2>{T('designers', 'Featured designers')}</h2><Link to="/register">Join as a designer</Link></div>
      {designers === null ? null : designers.length === 0 ? <Empty what="designers" /> : <div className="pills">{designers.map(d => <span key={d.id}>{d.name}{d.specialty ? ` · ${d.specialty}` : ''}</span>)}</div>}</section>,
    promos: <PromoBanners key="promos" fallback={<section className="sec promos"><Link to="/department/printing-services">Need custom printing? Order it here</Link><Link to="/department/branding-promotional">Branded T-shirts, mugs and more</Link><Link to="/studio">YAKU STUDIO: print, design and check your artwork</Link></section>} />,
  }
  const pos = (k: string) => secs[k]?.sort_order ?? HOME_KEYS.indexOf(k) * 10
  const order = [...HOME_KEYS].sort((a, b) => pos(a) - pos(b)).filter(k => secs[k]?.visible !== false)
  return <>
    <Helmet><title>YAKU Uganda | Stationery, Printing, Branding & Design</title></Helmet>
    <HeroBanner fallback={<section className="hero"><div><h1>Everything your office and brand needs, printed and delivered.</h1><p>Stationery, printers, branding and design from YAKU and trusted Ugandan vendors.</p>
      <Link className="btn" to="/department/printing-services">Order printing</Link> <Link className="btn ghost" to="/department/stationery-office-supplies">Shop stationery</Link></div></section>} />
    {order.flatMap((k, i) => (i === 1 ? [blocks[k], <AdSlot key="ad" placement="home" />] : [blocks[k]]))}
  </>
}
