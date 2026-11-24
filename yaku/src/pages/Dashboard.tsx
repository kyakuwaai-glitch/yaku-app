import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Role } from '../lib/supabase'
import { CustomerPanel, VendorPanel } from './Panels'
const menus: Record<Role, string[]> = {
  customer: ['Orders', 'Wishlist', 'Addresses', 'Design requests'],
  vendor: ['My products', 'Orders received', 'Payouts', 'Store profile'],
  designer: ['Portfolio', 'Design requests', 'Earnings', 'Profile'],
  admin: ['Role requests', 'Vendors', 'Designers', 'Products', 'Orders', 'Users'],
}
export default function Dashboard({ role }: { role: Role }) {
  return <div className="dash"><Helmet><meta name="robots" content="noindex" /></Helmet>
    <aside><h2>{role[0].toUpperCase() + role.slice(1)} dashboard</h2>{menus[role].map(m => <span key={m}>{m}</span>)}{role === 'admin' && <Link to="/dashboard/admin/manage"><b>Manage content</b></Link>}{role === 'admin' && <Link to="/console"><b>Business console</b></Link>}{role === 'admin' && <Link to="/dashboard/admin/providers"><b>Service providers</b></Link>}<Link to="/account">Profile</Link></aside>
    <section><h1>Welcome</h1><p>Your {role} tools will appear here as marketplace features are released.</p>
      {role === 'customer' ? <CustomerPanel /> : role === 'vendor' ? <VendorPanel /> : <div className="grid">{menus[role].map(m => <div className="card" key={m}><h3>{m}</h3><p className="empty">Available in the next phase.</p></div>)}</div>}</section></div>
}
