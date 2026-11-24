import { NavLink, Outlet } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
export const studioSections: [string, string, string, string][] = [
  ['assistant', 'YAKU AI Assistant', 'Ask about products, printing advice, orders and how YAKU works.', '💬'],
  ['print', 'Print Studio', 'Business cards, flyers, posters, banners, stickers, T-shirts, mugs and more. Get a quote and order.', '🖨️'],
  ['design', 'Design Studio', 'Describe a logo, poster or card and let AI create concepts.', '🎨'],
  ['inspector', 'Artwork Inspector', 'Upload artwork to check resolution, size, bleed and more, then compare a corrected copy.', '🔍'],
  ['pricing', 'Price Calculator', 'See quantity-based prices for printing jobs from YAKU’s price list.', '🧮'],
  ['orders', 'Print Orders', 'Track quotes, artwork approval, production and delivery of your printing jobs.', '📦'],
  ['support', 'AI Support', 'Help with orders, payments and problems, with a route to a real person.', '🛟'],
]
export default function StudioLayout() {
  return <div className="studio"><Helmet><title>YAKU STUDIO | YAKU Uganda</title><meta name="description" content="YAKU STUDIO: printing, AI design, artwork checking and print order tracking from YAKU Uganda." /></Helmet>
    <nav className="snav" aria-label="YAKU Studio sections"><NavLink end to="/studio">Studio home</NavLink>{studioSections.map(([p, l]) => <NavLink key={p} to={`/studio/${p}`}>{l}</NavLink>)}</nav>
    <div className="sbody"><Outlet /></div></div>
}
