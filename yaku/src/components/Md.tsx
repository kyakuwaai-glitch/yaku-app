import { Fragment, ReactNode } from 'react'
import { Link } from 'react-router-dom'
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/).map((p, i) => {
    const b = p.match(/^\*\*(.+)\*\*$/); if (b) return <strong key={i}>{b[1]}</strong>
    const l = p.match(/^\[(.+)\]\((.+)\)$/)
    if (l) return l[2].startsWith('/') ? <Link key={i} to={l[2]}>{l[1]}</Link> : /^https?:\/\//.test(l[2]) ? <a key={i} href={l[2]} rel="noopener noreferrer">{l[1]}</a> : <Fragment key={i}>{l[1]}</Fragment>
    return <Fragment key={i}>{p}</Fragment>
  })
}
/** Tiny safe renderer: ## / ### headings, "- " lists, **bold**, [text](/path). No raw HTML. */
export default function Md({ text }: { text: string }) {
  const out: ReactNode[] = []; let list: string[] = []
  const flush = () => { if (list.length) { out.push(<ul key={out.length}>{list.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>); list = [] } }
  text.split('\n').forEach(l => { const t = l.trim()
    if (t.startsWith('- ')) { list.push(t.slice(2)); return } flush()
    if (t.startsWith('### ')) out.push(<h3 key={out.length}>{inline(t.slice(4))}</h3>)
    else if (t.startsWith('## ')) out.push(<h2 key={out.length}>{inline(t.slice(3))}</h2>)
    else if (t) out.push(<p key={out.length}>{inline(t)}</p>) })
  flush(); return <div className="prose">{out}</div>
}
