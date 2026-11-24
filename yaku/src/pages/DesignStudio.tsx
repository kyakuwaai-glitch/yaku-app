import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { callFn, signed } from '../lib/ai'
import ConsentGate from '../components/AiConsent'
type Row = Record<string, any>
export default function DesignStudio() {
  const { session } = useAuth(); const [list, setList] = useState<Row[]>([]); const [urls, setUrls] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [prompt, setPrompt] = useState(''); const [n, setN] = useState(0)
  useEffect(() => { if (!session) return; Promise.resolve(supabase.from('artworks').select('id,path,prompt,created_at').eq('source', 'ai_design').order('created_at', { ascending: false }).limit(12)).then(async ({ data }) => { setList(data ?? []); const u: Record<string, string> = {}; for (const a of data ?? []) u[a.id] = await signed(a.path); setUrls(u) }) }, [session, n])
  async function gen(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setMsg('')
    const { error } = await callFn('design-generate', { prompt: f.get('prompt'), style: f.get('style'), colors: f.get('colors'), size: f.get('size') }); setBusy(false); if (error) return setMsg(error); setN(x => x + 1) }
  return <ConsentGate><div className="sec"><Helmet><title>Design Studio | YAKU Uganda</title></Helmet><h1>AI Design Studio</h1><p>Describe what you want and YAKU AI creates a design. Each click makes a new variation, so adjust your description and generate again to revise.</p>
    {!session ? <p className="empty"><Link to="/login">Sign in</Link> to create designs.</p> : <form className="sform" onSubmit={gen}><label>Describe your design<textarea name="prompt" rows={4} required minLength={10} maxLength={1000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A modern business card for Kampala Fresh Juice, green and white, with a leaf icon" /></label>
      <div className="cbtn"><label>Style<select name="style"><option>clean and professional</option><option>bold and colourful</option><option>elegant and minimal</option><option>playful</option><option>traditional</option></select></label><label>Colours<input name="colors" placeholder="e.g. navy and red" /></label><label>Shape<select name="size"><option value="1024x1024">Square</option><option value="1024x1536">Portrait</option><option value="1536x1024">Landscape</option></select></label></div>
      <button className="btn" disabled={busy}>{busy ? 'Generating… this can take a minute' : 'Generate design'}</button>{msg && <p role="alert" className="msg">{msg}</p>}
      <p className="note">AI can misspell words in images; always check the text. You confirm you have the right to use anything you upload. See our <Link to="/info/ipr">IPR policy</Link>.</p></form>}
    <div className="grid">{list.map(a => <article className="card" key={a.id}>{urls[a.id] && <img src={urls[a.id]} alt={a.prompt ?? 'AI design'} />}<p className="note">{a.prompt}</p><Link className="btn" to={`/studio/print?artwork=${a.id}`}>Print this</Link></article>)}</div></div></ConsentGate>
}
