import { cors, json, env, clients, whoami, useQuota, openai, notConfigured } from '../_shared/ai.ts'
type Info = { kind: 'image' | 'pdf'; width?: number; height?: number; dpi?: number | null; hasAlpha?: boolean; cmyk?: boolean; pages?: number; mediaMm?: [number, number]; hasTrim?: boolean; hasBleed?: boolean; fonts?: number; embedded?: number; rgb?: boolean; icc?: boolean; compressed?: boolean }
const pngInfo = (b: Uint8Array): Info => { const dv = new DataView(b.buffer, b.byteOffset); let dpi: number | null = null; let o = 8
  while (o + 8 < b.length) { const len = dv.getUint32(o), t = String.fromCharCode(...b.slice(o + 4, o + 8)); if (t === 'pHYs') { if (b[o + 16] === 1) dpi = Math.round(dv.getUint32(o + 8) * 0.0254); break } if (t === 'IDAT') break; o += 12 + len }
  return { kind: 'image', width: dv.getUint32(16), height: dv.getUint32(20), hasAlpha: b[25] === 4 || b[25] === 6, dpi } }
const jpgInfo = (b: Uint8Array): Info => { let o = 2, dpi: number | null = null, w = 0, h = 0, comps = 3
  while (o < b.length - 4) { if (b[o] !== 0xff) { o++; continue } const m = b[o + 1]; if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue } const len = (b[o + 2] << 8) | b[o + 3]
    if (m === 0xe0 && String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]) === 'JFIF') { const x = (b[o + 12] << 8) | b[o + 13]; if (b[o + 11] === 1) dpi = x; else if (b[o + 11] === 2) dpi = Math.round(x * 2.54) }
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { h = (b[o + 5] << 8) | b[o + 6]; w = (b[o + 7] << 8) | b[o + 8]; comps = b[o + 9]; break } o += 2 + len }
  return { kind: 'image', width: w, height: h, hasAlpha: false, dpi, cmyk: comps === 4 } }
const pdfInfo = (b: Uint8Array): Info => { const t = new TextDecoder('latin1').decode(b); const mb = t.match(/\/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]/)
  const mm = mb ? [(+mb[3] - +mb[1]) * 25.4 / 72, (+mb[4] - +mb[2]) * 25.4 / 72] as [number, number] : undefined
  return { kind: 'pdf', pages: (t.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length, mediaMm: mm, hasTrim: /\/TrimBox/.test(t), hasBleed: /\/BleedBox/.test(t), fonts: (t.match(/\/Type\s*\/Font(?![A-Za-z])/g) ?? []).length, embedded: (t.match(/\/FontFile[23]?(?![A-Za-z])/g) ?? []).length, rgb: /\/DeviceRGB/.test(t), icc: /\/ICCBased/.test(t), compressed: /\/ObjStm/.test(t) } }
const issue = (code: string, severity: 'error' | 'warning' | 'info', title: string, why: string, fix: string, auto: string[] = []) => ({ code, severity, title, why, fix, auto })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { user, admin } = clients(req); const u = await whoami(user); if (!u) return json({ error: 'Sign in required.' }, 401)
    const { artwork_id, target, consent } = await req.json(); const tw = Number(target?.width_mm), th = Number(target?.height_mm), bleed = Number(target?.bleed_mm ?? 3)
    if (!(tw > 0 && th > 0)) return json({ error: 'Enter the finished width and height in millimetres first.' }, 400)
    const { data: art } = await admin.from('artworks').select('*').eq('id', artwork_id).maybeSingle()
    if (!art || art.owner_id !== u.id) return json({ error: 'Artwork not found.' }, 404)
    const { data: file, error } = await admin.storage.from('artwork').download(art.path); if (error || !file) return json({ error: 'Could not read the file.' }, 500)
    if (file.size > 15 * 1024 * 1024) return json({ error: 'File is larger than 15 MB.' }, 413)
    const b = new Uint8Array(await file.arrayBuffer()); const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, isJpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, isPdf = String.fromCharCode(...b.slice(0, 4)) === '%PDF'
    if (!isPng && !isJpg && !isPdf) return json({ error: 'This file is not a real PNG, JPG or PDF, so it was rejected.' }, 415)
    const m = isPng ? pngInfo(b) : isJpg ? jpgInfo(b) : pdfInfo(b); const issues: ReturnType<typeof issue>[] = []; const fw = tw + 2 * bleed, fh = th + 2 * bleed
    if (m.kind === 'image') {
      const dpi = Math.min(m.width! / (fw / 25.4), m.height! / (fh / 25.4)); (m as any).effective_dpi = Math.round(dpi)
      if (dpi < 150) issues.push(issue('low_res', 'error', 'Image resolution is too low', `At ${tw}×${th} mm this image gives about ${Math.round(dpi)} DPI. Printing needs about 300 DPI, so it will look blurry or pixelated.`, 'Supply a larger original file or choose a smaller print size. Software cannot add real detail; ask a designer to rebuild it if no larger file exists.'))
      else if (dpi < 300) issues.push(issue('low_res', 'warning', 'Resolution is below the recommended 300 DPI', `About ${Math.round(dpi)} DPI at the chosen size. Small text and fine lines may look soft.`, 'Use a larger original if you have one, or accept slightly softer print.'))
      const ratio = m.width! / m.height!, withB = fw / fh, trim = tw / th
      if (Math.abs(ratio / withB - 1) > 0.02) { const nearTrim = Math.abs(ratio / trim - 1) <= 0.02
        issues.push(issue(nearTrim ? 'no_bleed' : 'ratio', nearTrim ? 'warning' : 'error', nearTrim ? 'No bleed area' : 'Wrong shape for this print size', nearTrim ? 'The image matches the trimmed size, so it has no extra edge for cutting. A white sliver can appear at the edges.' : `The image proportions differ from ${tw}×${th} mm, so it would be stretched or cropped.`, nearTrim ? `Add ${bleed} mm of bleed on every side.` : 'Crop the artwork to the right proportions.', nearTrim ? ['add_bleed'] : ['crop_to_ratio'])) }
      if (m.hasAlpha) issues.push(issue('transparency', 'warning', 'Transparent background', 'Transparent areas print as white or as an unpredictable colour depending on the printer.', 'Fill transparent areas with the colour you want.', ['flatten_white']))
      if (m.cmyk) issues.push(issue('cmyk', 'info', 'CMYK JPEG', 'CMYK files can display with wrong colours in some viewers.', 'Check colours on a proof.'))
      else issues.push(issue('rgb', 'info', 'RGB image', 'Screens show more vivid colours than printers can reproduce, so printed colours can look duller.', 'Ask for a proof if colour accuracy matters.'))
    } else {
      if (!m.mediaMm) issues.push(issue('pdf_size', 'warning', 'Could not read the PDF page size', 'The page size is hidden in this PDF structure.', 'Export again as a standard PDF.'))
      else { const [w, h] = m.mediaMm, ok = (a: number, c: number) => Math.abs(w - a) < 1.5 && Math.abs(h - c) < 1.5
        if (!ok(fw, fh) && !ok(tw, th) && !ok(fh, fw) && !ok(th, tw)) issues.push(issue('pdf_size', 'error', 'PDF page size does not match', `The page is ${w.toFixed(0)}×${h.toFixed(0)} mm but the job is ${tw}×${th} mm (${fw}×${fh} mm with bleed).`, 'Export the PDF at the finished size plus bleed.'))
        else if (ok(tw, th) || ok(th, tw)) issues.push(issue('no_bleed', 'warning', 'No bleed in the PDF', 'The page equals the trimmed size, so there is no extra edge for cutting.', `Export with ${bleed} mm bleed.`)) }
      if ((m.fonts ?? 0) > (m.embedded ?? 0)) issues.push(issue('fonts', 'warning', 'Some fonts may not be embedded', `Found ${m.fonts} font entries but only ${m.embedded} embedded font files. Missing fonts get replaced and text can change.`, 'Export with "embed all fonts" or convert text to outlines.'))
      if (m.rgb && !m.icc) issues.push(issue('rgb', 'warning', 'RGB colours in the PDF', 'Colours can shift when converted for printing.', 'Export in CMYK if the printer requires it.'))
      if (m.compressed) issues.push(issue('limited', 'info', 'Limited PDF check', 'This PDF compresses its internal objects, so font and colour checks may be incomplete.', 'A staff member will check it before printing.'))
      issues.push(issue('pdf_visual', 'info', 'Spelling and layout not auto-checked for PDFs', 'Visual review currently works on PNG and JPG files only.', 'Proofread the text yourself or ask for designer help.'))
    }
    let ai: any = { status: 'skipped' }
    if (m.kind === 'image' && file.size <= 4 * 1024 * 1024 && !notConfigured(['OPENAI_API_KEY']) === true && consent === true) {
      if (await useQuota(admin, u.id, 'requests', Number(env('AI_DAILY_LIMIT_USER')) || 40)) {
        try { const b64 = btoa(String.fromCharCode(...b)); const r = await openai('chat/completions', { model: env('OPENAI_MODEL') || 'gpt-4o-mini', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: 'You review print artwork. Report only what is visible. Reply as JSON: {"summary":string,"spelling":[{"found":string,"suggestion":string}],"layout":[{"type":"margin"|"alignment"|"overlap"|"contrast"|"other","description":string}]}. Do not guess; use empty arrays if you see nothing.' }, { type: 'image_url', image_url: { url: `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${b64}` } }] }] })
          const j = JSON.parse(r.choices[0].message.content); ai = { status: 'done', ...j }
          for (const s of j.spelling ?? []) issues.push(issue('spelling', 'warning', `Possible spelling error: "${s.found}"`, 'Mistakes printed on 100s of items are expensive to fix.', `Consider "${s.suggestion}". The AI cannot edit text inside flattened artwork; ask a designer or upload a fixed file.`))
          for (const l of j.layout ?? []) issues.push(issue('layout_' + l.type, 'warning', `Layout: ${l.type}`, l.description, 'Check this area and adjust the design or ask a designer for help.')) } catch (e) { ai = { status: 'failed', error: 'The AI visual review failed. File checks above still apply.' } } }
      else ai = { status: 'skipped', reason: 'Daily AI limit reached' }
    } else if (m.kind === 'image') ai = consent !== true ? { status: 'skipped', reason: 'AI consent not given' } : notConfigured(['OPENAI_API_KEY']) ? { status: 'not_configured', missing: ['OPENAI_API_KEY'] } : { status: 'skipped', reason: 'Image too large for AI review (over 4 MB)' }
    const { data: ins } = await admin.from('artwork_inspections').insert({ artwork_id, metrics: m, issues, ai_review: ai }).select('id').single()
    return json({ inspection_id: ins?.id, metrics: m, issues, ai_review: ai, note: issues.some(i => i.severity === 'error') ? 'Problems were found that should be fixed before printing.' : 'No blocking file problems were detected by the automated checks. This is not a guarantee the job is print-ready; a YAKU staff member still checks it before production.' })
  } catch (e) { console.error(e); return json({ error: 'Inspection failed. Please try again.' }, 500) }
})
