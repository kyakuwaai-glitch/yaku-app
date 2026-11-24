import { useEffect, useState, ReactNode } from 'react'
export type Row = Record<string, any>
type Res = PromiseLike<{ data: any; error: { message: string } | null }>
export function useData<T = Row[]>(load: () => Res, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [err, setErr] = useState(''); const [n, setN] = useState(0)
  useEffect(() => { let on = true; Promise.resolve(load()).then(r => { if (on) { setErr(r.error?.message ?? ''); setData(r.data as T) } }); return () => { on = false } }, [...deps, n])
  return { data, err, reload: () => setN(x => x + 1) }
}
export const Err = ({ m }: { m: string }) => (m ? <p className="msg" role="alert">{m}</p> : null)
export const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kampala' }) : '–')
export const ugx = (n: unknown) => `UGX ${Math.round(Number(n ?? 0)).toLocaleString()}`
export const Stat = ({ l, v }: { l: string; v: ReactNode }) => <div className="stat"><span>{l}</span><strong>{v}</strong></div>
export function Table({ cols, rows, empty = 'Nothing here yet.' }: { cols: [string, (r: Row) => ReactNode][]; rows: Row[] | null; empty?: string }) {
  if (!rows) return <p>Loading…</p>
  if (!rows.length) return <p className="empty">{empty}</p>
  return <div className="tw"><table><thead><tr>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id ?? i}>{cols.map(([h, f]) => <td key={h}>{f(r)}</td>)}</tr>)}</tbody></table></div>
}
export async function run(p: PromiseLike<{ error: { message: string } | null }>, set: (m: string) => void, ok: string, after?: () => void) {
  const { error } = await p; set(error ? error.message : ok); if (!error) after?.()
}
export function range(k: string): [string, string] {
  const now = new Date(); const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const end = new Date(day.getTime() + 864e5)
  const from = k === 'daily' ? day : k === 'weekly' ? new Date(day.getTime() - 6 * 864e5) : new Date(now.getFullYear(), now.getMonth(), 1)
  return [from.toISOString(), end.toISOString()]
}
export const Period = ({ v, set }: { v: string; set: (x: string) => void }) => (
  <select className="noprint" value={v} onChange={e => set(e.target.value)} aria-label="Period"><option value="daily">Daily (today)</option><option value="weekly">Weekly (last 7 days)</option><option value="monthly">Monthly (this month)</option></select>
)
export const openFile = async (bucketPath: string, bucket = 'submissions') => {
  const { supabase } = await import('../../lib/supabase')
  const { data } = await supabase.storage.from(bucket).createSignedUrl(bucketPath, 300); if (data) window.open(data.signedUrl, '_blank', 'noopener')
}
