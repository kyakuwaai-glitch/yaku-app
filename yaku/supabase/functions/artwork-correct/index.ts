import { cors, json, clients, whoami } from '../_shared/ai.ts'
import { Image } from 'npm:imagescript@1.3.0'
// Safe, mechanical corrections only. The original file is never modified; a new version is saved beside it.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { user, admin } = clients(req); const u = await whoami(user); if (!u) return json({ error: 'Sign in required.' }, 401)
    const { artwork_id, fixes, target } = await req.json(); const tw = Number(target?.width_mm), th = Number(target?.height_mm), bleed = Number(target?.bleed_mm ?? 3)
    const allowed = ['flatten_white', 'crop_to_ratio', 'add_bleed']; const todo = (Array.isArray(fixes) ? fixes : []).filter((f: string) => allowed.includes(f))
    if (!todo.length || !(tw > 0 && th > 0)) return json({ error: 'Choose at least one correction and set the print size.' }, 400)
    const { data: art } = await admin.from('artworks').select('*').eq('id', artwork_id).maybeSingle(); if (!art || art.owner_id !== u.id) return json({ error: 'Artwork not found.' }, 404)
    if (art.mime === 'application/pdf') return json({ error: 'PDF files cannot be corrected automatically. Please request designer help.' }, 422)
    const { data: file } = await admin.storage.from('artwork').download(art.path); if (!file) return json({ error: 'Could not read the file.' }, 500)
    let img = (await Image.decode(new Uint8Array(await file.arrayBuffer()))) as Image
    if (img.width * img.height > 40_000_000) return json({ error: 'Image is too large to correct automatically. Request designer help.' }, 422)
    const notes: string[] = []
    if (todo.includes('flatten_white')) { const bg = new Image(img.width, img.height).fill(0xffffffff); bg.composite(img, 0, 0); img = bg; notes.push('Transparent areas filled with white') }
    if (todo.includes('crop_to_ratio')) { const r = todo.includes('add_bleed') ? tw / th : (tw + 2 * bleed) / (th + 2 * bleed); let w = img.width, h = img.height
      if (w / h > r) w = Math.round(h * r); else h = Math.round(w / r); img = img.crop(Math.floor((img.width - w) / 2), Math.floor((img.height - h) / 2), w, h); notes.push('Centre-cropped to the correct proportions') }
    if (todo.includes('add_bleed')) { const w = img.width, h = img.height, bp = Math.max(1, Math.round(w * bleed / tw)); const c = new Image(w + 2 * bp, h + 2 * bp); c.composite(img, bp, bp)
      const put = (x: number, y: number, cw: number, ch: number, fh: boolean, fv: boolean, dx: number, dy: number) => c.composite(img.clone().crop(x, y, cw, ch).flip(fh, fv), dx, dy)
      put(0, 0, w, bp, false, true, bp, 0); put(0, h - bp, w, bp, false, true, bp, h + bp); put(0, 0, bp, h, true, false, 0, bp); put(w - bp, 0, bp, h, true, false, w + bp, bp)
      put(0, 0, bp, bp, true, true, 0, 0); put(w - bp, 0, bp, bp, true, true, w + bp, 0); put(0, h - bp, bp, bp, true, true, 0, h + bp); put(w - bp, h - bp, bp, bp, true, true, w + bp, h + bp)
      img = c; notes.push(`Added ${bleed} mm bleed by mirroring the edges (check the edges look right)`) }
    const out = await img.encode(); const path = `${u.id}/${artwork_id}/corrected-${Date.now()}.png`
    const up = await admin.storage.from('artwork').upload(path, out, { contentType: 'image/png' }); if (up.error) return json({ error: 'Could not save the corrected copy.' }, 500)
    const { data: v } = await admin.from('artwork_versions').insert({ artwork_id, path, note: notes.join('; ') }).select('id').single()
    return json({ version_id: v?.id, path, notes })
  } catch (e) { console.error(e); return json({ error: 'Correction failed. Please request designer help.' }, 500) }
})
