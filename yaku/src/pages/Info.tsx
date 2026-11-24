import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { defaultPages, DEFAULT_UPDATED } from '../content/pages'
import { fill, useSettings, usePage } from '../lib/cms'
import Md from '../components/Md'
import SubmissionForm from '../components/SubmissionForm'
import Campaign from '../components/Campaign'
export function Soon({ title }: { title: string }) {
  return <section className="form"><h1>{title}</h1><p>This feature is part of the next build phase. Your items will be stored securely in your YAKU account.</p><Link className="btn" to="/">Keep shopping</Link></section>
}
export default function Info({ notFound }: { notFound?: boolean }) {
  const { slug = '' } = useParams(); const def = defaultPages[slug]; const s = useSettings(); const { row, loading } = usePage(slug)
  if (notFound || !def) return <section className="form"><Helmet><title>Page not found | YAKU Uganda</title></Helmet><h1>Page not found</h1><p>The page you asked for does not exist.</p><Link className="btn" to="/">Go to homepage</Link></section>
  if (loading) return <p className="pad">Loading…</p>
  const title = row?.title ?? def.t; const body = fill(row?.body ?? def.b, s)
  const desc = row?.description || body.replace(/[#*\[\]()\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155)
  const updated = new Date(row?.updated_at ?? DEFAULT_UPDATED).toLocaleDateString('en-UG', { dateStyle: 'long' })
  return <article className="sec info"><Helmet><title>{title} | YAKU Uganda</title><meta name="description" content={desc} /></Helmet>
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / <span aria-current="page">{title}</span></nav>
    <h1>{title}</h1><p className="upd">Last updated: {updated}</p>
    <Md text={body} />
    {def.k === 'campaign' && <Campaign kind={def.f!} label={title} />}
    {def.k === 'form' && <SubmissionForm type={def.f!} slug={slug} />}
    {slug === 'cookies' && <button className="btn" onClick={() => dispatchEvent(new Event('yaku:cookies'))}>Manage cookie preferences</button>}
  </article>
}
