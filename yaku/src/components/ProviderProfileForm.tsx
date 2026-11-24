import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { uploadImage, mediaUrl } from '../lib/providers'
type Row = Record<string, any>
export default function ProviderProfileForm({ provider, uid, onSaved }: { provider?: Row | null; uid: string; onSaved: () => void }) {
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setMsg(''); let logo_path = provider?.logo_path ?? null; const file = f.get('logo') as File
    if (file && file.size > 0) { const r = await uploadImage(uid, file); if (r.error) { setBusy(false); return setMsg(r.error) } logo_path = r.path }
    const row = { business_name: String(f.get('name')).trim(), description: f.get('desc') || null, location: f.get('loc') || null, working_areas: String(f.get('areas') ?? '').split(',').map(s => s.trim()).filter(Boolean), phone: f.get('phone') || null, email: f.get('email') || null, logo_path }
    const { error } = provider ? await supabase.from('providers').update(row).eq('id', provider.id) : await supabase.from('providers').insert({ ...row, owner_id: uid })
    setBusy(false); if (error) return setMsg(error.message); setMsg(provider ? 'Profile saved.' : 'Submitted. YAKU will review your profile before it appears publicly.'); onSaved() }
  return <form className="sform" onSubmit={save}>
    <label>Business or professional name<input name="name" required defaultValue={provider?.business_name ?? ''} /></label>
    <label>Description<textarea name="desc" rows={4} defaultValue={provider?.description ?? ''} /></label>
    <label>Location (town / area)<input name="loc" defaultValue={provider?.location ?? ''} /></label>
    <label>Working areas (comma separated)<input name="areas" defaultValue={(provider?.working_areas ?? []).join(', ')} placeholder="Kampala, Wakiso, Entebbe" /></label>
    <div className="cbtn"><label>Business phone<input name="phone" type="tel" defaultValue={provider?.phone ?? ''} /></label><label>Business email<input name="email" type="email" defaultValue={provider?.email ?? ''} /></label></div>
    <label>Logo or profile image (PNG, JPG, WebP, under 5 MB){provider?.logo_path && <img src={mediaUrl(provider.logo_path)} alt="" width="80" />}<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label>
    <p className="note">The phone and email you enter here are shown publicly on your profile.</p>
    <button className="btn" disabled={busy}>{busy ? 'Saving…' : provider ? 'Save profile' : 'Submit for approval'}</button>{msg && <p className="msg" role="status">{msg}</p>}</form>
}
