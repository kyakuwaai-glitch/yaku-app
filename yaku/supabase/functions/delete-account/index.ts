import { cors, json, clients, whoami } from '../_shared/ai.ts'
async function walk(admin: any, bucket: string, prefix: string): Promise<string[]> {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 }); const out: string[] = []
  for (const f of data ?? []) { const p = `${prefix}/${f.name}`; if (f.id) out.push(p); else out.push(...await walk(admin, bucket, p)) }
  return out
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { user, admin } = clients(req); const u = await whoami(user); if (!u) return json({ error: 'Sign in required.' }, 401)
    const b = await req.json().catch(() => ({})); if (b.confirm !== 'DELETE') return json({ error: 'Type DELETE to confirm.' }, 400)
    const { data: blockers } = await admin.rpc('account_deletion_blockers', { p_uid: u.id })
    if (blockers?.length) {   // still counts as a deletion request: support finishes it by hand
      await admin.from('tickets').insert({ user_id: u.id, email: u.email, category: 'account_deletion', subject: 'Account deletion request', description: 'Requested in the app. Open items: ' + blockers.join(' ') })
      return json({ status: 'needs_review', blockers })
    }
    for (const bucket of ['artwork', 'ai-attachments', 'provider-media']) { const files = await walk(admin, bucket, u.id); for (let i = 0; i < files.length; i += 100) await admin.storage.from(bucket).remove(files.slice(i, i + 100)) }
    const an = await admin.rpc('anonymize_user', { p_uid: u.id }); if (an.error) { console.error(an.error); return json({ error: 'Could not remove your data. Please contact support.' }, 500) }
    const del = await admin.auth.admin.deleteUser(u.id); if (del.error) { console.error(del.error); return json({ error: 'Could not delete the account. Please contact support.' }, 500) }
    return json({ status: 'deleted' })
  } catch (e) { console.error(e); return json({ error: 'Something went wrong. Please try again or contact support.' }, 500) }
})
