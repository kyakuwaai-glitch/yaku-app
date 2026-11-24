import { useEffect, useState } from 'react'
import { supabase, supabaseReady, ugx, imgUrl } from '../lib/supabase'
const fmt = (d: string) => new Date(d).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kampala' })
export default function Campaign({ kind, label }: { kind: string; label: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => { if (!supabaseReady) return setRows([])
    Promise.resolve(supabase.from('campaigns').select('id,title,starts_at,ends_at,campaign_items(id,promo_price_ugx,stock_limit,sold,products(id,title,price_ugx,image_path))')
      .eq('kind', kind).eq('active', true).gt('ends_at', new Date().toISOString()).order('starts_at')).then(({ data }) => setRows(data ?? [])) }, [kind])
  if (rows === null) return <p>Loading…</p>
  if (!rows.length) return <p className="empty">No {label} campaign is running right now. Please check back soon.</p>
  return <>{rows.map(c => { const live = new Date(c.starts_at) <= new Date()
    return <section key={c.id}><h2>{c.title}</h2>
      <p>{live ? `Ends ${fmt(c.ends_at)}` : `Starts ${fmt(c.starts_at)} and ends ${fmt(c.ends_at)}`} (East Africa Time)</p>
      {live && <div className="grid">{c.campaign_items.map((i: any) => { const p = i.products; if (!p) return null
        const off = p.price_ugx && i.promo_price_ugx < p.price_ugx ? Math.round((1 - i.promo_price_ugx / p.price_ugx) * 100) : 0
        const left = i.stock_limit == null ? null : Math.max(i.stock_limit - i.sold, 0)
        return <article className="card" key={i.id}><img loading="lazy" src={imgUrl(p.image_path)} alt="" width="240" height="180" /><h3>{p.title}</h3>
          <p className="price">{ugx(i.promo_price_ugx)}{off > 0 && <s>{ugx(p.price_ugx)}</s>}</p>{off > 0 && <p><strong>{off}% off</strong></p>}
          {left !== null && <p>{left === 0 ? 'Sold out' : `${left} left`}</p>}</article> })}</div>}</section> })}</>
}
