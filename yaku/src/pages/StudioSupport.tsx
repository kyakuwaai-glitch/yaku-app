import { Link } from 'react-router-dom'
import Chat from '../components/Chat'
export default function StudioSupport() {
  return <div><h1>AI Support</h1><p>Ask about your order, a payment, or a problem with a print. For private order details you need to be signed in. The AI cannot confirm payments or issue refunds; it can open a ticket for our team.</p>
    <div className="cbtn"><Link className="btn ghost" to="/studio/orders">My print orders</Link><Link className="btn ghost" to="/info/create-return">Create a return</Link><Link className="btn ghost" to="/info/contact">Contact a person</Link></div>
    <div className="aipage"><Chat starters={['Where is my printing order?', 'I have a payment problem', 'My print came out wrong', 'I need to change my order']} /></div></div>
}
