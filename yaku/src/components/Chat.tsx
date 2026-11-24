import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { callFn } from '../lib/ai'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import ConsentGate from './AiConsent'
type Msg = { role: 'user' | 'assistant'; content: string }
type Att = { path: string; name: string }
type SpeechResult = { isFinal: boolean; 0: { transcript: string } }
type SpeechEvent = Event & { results: { length: number; [index: number]: SpeechResult }; resultIndex: number }
type SpeechError = Event & { error: string }
type Recognizer = {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: SpeechError) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognizerClass = new () => Recognizer
const MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json' }
const hints: Record<string, string[]> = { customer: ['How much for 200 business cards?', 'Show me A4 paper', 'Track my order'], vendor: ['Write a description for my product', 'How are my earnings?'], admin: ['Weekly business summary', 'Which products are low on stock?', 'Any failed payments?'] }
const getRecognizer = (): RecognizerClass | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}
const speechText = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#]/g, '').trim()
export default function Chat({ scope = 'customer', initial = [], cid: startCid = null, starters }: { scope?: 'customer' | 'vendor' | 'admin'; initial?: Msg[]; cid?: string | null; starters?: string[] }) {
  const { session } = useAuth(); const [msgs, setMsgs] = useState<Msg[]>(initial); const [cid, setCid] = useState<string | null>(startCid); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [atts, setAtts] = useState<Att[]>([]); const [up, setUp] = useState(false); const [draft, setDraft] = useState(''); const [listening, setListening] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(false); const [speaking, setSpeaking] = useState(false)
  const end = useRef<HTMLDivElement>(null); const recognition = useRef<Recognizer | null>(null); const sendOnEnd = useRef(false); const voiceRepliesRef = useRef(false); const mounted = useRef(true)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false; sendOnEnd.current = false; recognition.current?.abort(); recognition.current = null
      if (canSpeak) window.speechSynthesis.cancel()
    }
  }, [canSpeak])
  function speak(text: string) {
    const content = speechText(text)
    if (!voiceRepliesRef.current || !canSpeak || !content) return
    const utterance = new SpeechSynthesisUtterance(content)
    utterance.lang = navigator.language || 'en-UG'; utterance.rate = 1
    utterance.onstart = () => { if (mounted.current) setSpeaking(true) }
    const done = () => { if (mounted.current) setSpeaking(false) }
    utterance.onend = done; utterance.onerror = done
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance)
  }
  function toggleVoiceReplies() {
    if (!canSpeak) return
    const next = !voiceRepliesRef.current; voiceRepliesRef.current = next; setVoiceReplies(next)
    if (!next) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const last = [...msgs].reverse().find(m => m.role === 'assistant'); if (last) speak(last.content)
  }
  function toggleListening() {
    const Recognition = getRecognizer()
    if (!Recognition) return setErr('Voice input is not supported in this browser. You can still type your message.')
    if (listening) { sendOnEnd.current = true; recognition.current?.stop(); return }
    if (busy || up) return
    if (canSpeak) { voiceRepliesRef.current = true; setVoiceReplies(true) }
    const base = draft.trim(); const recognizer = new Recognition(); let finalText = ''
    recognizer.lang = navigator.language || 'en-UG'; recognizer.interimResults = true; recognizer.continuous = false
    recognizer.onresult = event => {
      let final = '', interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) final += result[0].transcript; else interim += result[0].transcript
      }
      if (final) finalText = final
      setDraft([base, (final || interim).trim()].filter(Boolean).join(' '))
    }
    recognizer.onerror = event => {
      if (event.error === 'aborted') return
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone access was blocked. Allow it in your browser settings or type your message.'
        : event.error === 'no-speech' ? 'No speech was detected. Tap the microphone and try again.'
          : event.error === 'audio-capture' ? 'No microphone was found. Connect one or type your message.'
            : 'Voice input could not start. Please try again or type your message.'
      setErr(message)
    }
    recognizer.onend = () => {
      if (!mounted.current) return
      recognition.current = null; setListening(false)
      const shouldSend = sendOnEnd.current; sendOnEnd.current = false; const heard = finalText.trim()
      if (shouldSend && heard) { setDraft(''); send(heard) } else if (heard) setDraft([base, heard].filter(Boolean).join(' '))
    }
    recognition.current = recognizer; sendOnEnd.current = true; setErr(''); setListening(true)
    try { recognizer.start() } catch { recognition.current = null; setListening(false); sendOnEnd.current = false; setErr('Voice input could not start. Please try again or type your message.') }
  }
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''; setErr('')
    if (!session) return setErr('Sign in to attach files.'); if (atts.length + files.length > 3) return setErr('You can attach up to 3 files per message.')
    setUp(true)
    for (const f of files) { const mime = MIME[f.name.split('.').pop()?.toLowerCase() ?? '']
      if (!mime) { setErr(`"${f.name}" can't be read by the AI. Save it as a PDF, or attach an image or a TXT/CSV file.`); continue } if (f.size > 10 * 1024 * 1024) { setErr(`"${f.name}" is over 10 MB.`); continue }
      const path = `${session.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, '_')}`
      const { error } = await supabase.storage.from('ai-attachments').upload(path, f, { contentType: mime }); if (error) { setErr(error.message); continue }
      setAtts(a => [...a, { path, name: f.name }]) }
    setUp(false) }
  const drop = async (a: Att) => { setAtts(x => x.filter(y => y.path !== a.path)); await supabase.storage.from('ai-attachments').remove([a.path]) }
  async function send(text: string) {
    const t = text.trim() || (atts.length ? 'Please look at the attached file(s).' : ''); if (!t || busy || up) return; setErr(''); setDraft('')
    const next: Msg[] = [...msgs, { role: 'user', content: t + (atts.length ? '\n📎 ' + atts.map(a => a.name).join(', ') : '') }]; setMsgs(next); setBusy(true)
    const { data, error } = await callFn<{ reply: string; conversation_id: string | null }>('ai-chat', { message: t, scope, conversation_id: cid, history: msgs.slice(-8), attachments: atts }); setBusy(false)
    if (error || !data) return setErr(error ?? 'No reply.'); setAtts([]); setCid(data.conversation_id); setMsgs([...next, { role: 'assistant', content: data.reply }]); speak(data.reply) }
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); send(draft) }
  return <ConsentGate><div className="chat">
    <div className="cmsgs" aria-live="polite">{msgs.length === 0 && <><p className="ab">Hello! I'm YAKU AI. Ask me about products, printing prices, orders or how YAKU works. You can type, use your voice or attach a PDF, image or text file.</p><div className="cbtn">{(starters ?? hints[scope]).map(h => <button key={h} className="chip" onClick={() => send(h)}>{h}</button>)}</div></>}
      {msgs.map((m, i) => <p key={i} className={m.role === 'user' ? 'ub' : 'ab'}>{m.content}</p>)}{busy && <p className="ab">Thinking…</p>}{err && <p className="msg" role="alert">{err}</p>}<div ref={end} /></div>
    {(atts.length > 0 || up) && <div className="cbtn">{atts.map(a => <span key={a.path} className="chip">📎 {a.name} <button className="link" onClick={() => drop(a)} aria-label={`Remove ${a.name}`}>✕</button></span>)}{up && <span className="note">Uploading…</span>}</div>}
    <div className="cvoicebar"><button type="button" className={`voice-toggle${voiceReplies ? ' on' : ''}`} onClick={toggleVoiceReplies} aria-pressed={voiceReplies} disabled={!canSpeak} title={canSpeak ? 'Hear AI replies aloud' : 'Spoken replies are not supported in this browser'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></svg><span>{speaking ? 'Speaking…' : `Voice replies ${voiceReplies ? 'on' : 'off'}`}</span></button>
      {listening && <span className="listening" role="status"><i />Listening… tap mic to stop</span>}</div>
    <form className="cin" onSubmit={submit}><label className="attach" title="Attach PDF, image or text files" aria-label="Attach files">📎<input type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.md,.json" onChange={pick} /></label>
      <input name="q" value={draft} onChange={e => setDraft(e.target.value)} placeholder={listening ? 'Listening…' : 'Type your question…'} maxLength={2000} autoComplete="off" aria-label="Message YAKU AI" />
      <button type="button" className={`mic${listening ? ' listening' : ''}`} onClick={toggleListening} aria-label={listening ? 'Stop voice input and send' : 'Start voice input'} aria-pressed={listening} disabled={busy || up} title={listening ? 'Stop and send voice message' : 'Record a voice message'}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{listening ? <path d="M8 8v8h8V8z" fill="currentColor" stroke="none" /> : <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-7-3a7 7 0 0 0 14 0M12 18v3" />}</svg></button>
      <button className="btn" disabled={busy || up || listening}>Send</button></form>
    <p className="note">Voice input uses your browser's speech service; spoken replies use your device voice. AI can make mistakes. It reads PDF, images and TXT/CSV/MD/JSON files (Word/Excel: save as PDF). To check artwork for printing use the <Link to="/studio/inspector">Artwork Inspector</Link>. Need a person? <Link to="/info/contact">Contact support</Link></p></div></ConsentGate>
}
