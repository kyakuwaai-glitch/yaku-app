import { cors, json, env, clients, whoami, useQuota, openai, notConfigured } from '../_shared/ai.ts'
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const nc = notConfigured(['OPENAI_API_KEY']); if (nc) return nc
  try {
    const { user, admin } = clients(req); const u = await whoami(user); if (!u) return json({ error: 'Sign in to generate designs.' }, 401)
    const b = await req.json(); if (b.consent !== true) return json({ error: 'Please agree to AI data sharing before using the Design Studio.' }, 400); const prompt = String(b.prompt ?? '').trim().slice(0, 1000); if (prompt.length < 10) return json({ error: 'Describe the design in a little more detail.' }, 400)
    const size = ['1024x1024', '1024x1536', '1536x1024'].includes(b.size) ? b.size : '1024x1024'
    if (!await useQuota(admin, u.id, 'images', Number(env('AI_DAILY_IMAGE_LIMIT')) || 5)) return json({ error: 'Daily design limit reached. Try again tomorrow or ask a YAKU designer.' }, 429)
    const full = `${prompt}. Style: ${String(b.style ?? 'clean, professional').slice(0, 60)}. Colours: ${String(b.colors ?? 'any suitable').slice(0, 80)}. A print-ready graphic design with clear, correctly spelled text, generous margins, flat artwork (no mock-up scene).`
    const r = await openai('images/generations', { model: env('OPENAI_IMAGE_MODEL') || 'gpt-image-1', prompt: full, size, n: 1 })
    const b64 = r.data?.[0]?.b64_json; if (!b64) return json({ error: 'The image service did not return an image. Nothing was generated.' }, 502)
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const path = `${u.id}/design-${crypto.randomUUID()}.png`
    const up = await admin.storage.from('artwork').upload(path, bytes, { contentType: 'image/png' }); if (up.error) return json({ error: 'Generated, but could not save the image.' }, 500)
    const { data } = await admin.from('artworks').insert({ owner_id: u.id, path, original_name: 'AI design.png', mime: 'image/png', size_bytes: bytes.length, source: 'ai_design', prompt }).select('id').single()
    return json({ artwork_id: data?.id })
  } catch (e) { console.error(e); return json({ error: (e as Error).message || 'Design generation failed.' }, 502) }
})
