import { useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { hasAiConsent, setAiConsent } from '../lib/ai'
/** Shows an opt-in before any personal data is sent to the third-party AI provider (App Store 5.1.2(i), Google Play User Data policy). */
export default function ConsentGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(hasAiConsent())
  if (ok) return <>{children}</>
  return <div className="card" role="dialog" aria-label="AI data sharing"><h3>Before you use YAKU AI</h3>
    <p>YAKU AI is powered by <b>OpenAI</b>, a third-party AI provider. When you use it, the text you type, files you attach, and artwork or design requests you submit are sent to OpenAI to produce replies, images and checks. Please do not share anything you do not want processed this way. See our <Link to="/info/privacy">Privacy Policy</Link>.</p>
    <div className="cbtn"><button className="btn" onClick={() => { setAiConsent(true); setOk(true) }}>I agree</button><Link className="btn ghost" to="/">No thanks</Link></div></div>
}
