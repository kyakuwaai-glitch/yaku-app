import { Link } from 'react-router-dom'
import { studioSections } from './StudioLayout'
import { useAuth } from '../auth/AuthContext'
export default function StudioHome() {
  const { staffRoles } = useAuth()
  return <div><section className="shero"><h1>YAKU STUDIO</h1><p>Print, design and perfect your artwork in one place. Use the same YAKU account you use in the store.</p><Link className="btn" to="/studio/print">Start a print job</Link> <Link className="btn ghost" to="/">Back to YAKU Store</Link></section>
    <div className="scards">{studioSections.map(([p, l, d, i]) => <Link key={p} to={`/studio/${p}`} className="scard"><span aria-hidden="true">{i}</span><h3>{l}</h3><p>{d}</p></Link>)}</div>
    {staffRoles.length > 0 && <p className="note">Staff: manage <Link to="/console">pricing rules, printing production and quality control</Link> in the Business Console.</p>}</div>
}
