import { cors, json, env, clients, whoami, useQuota, openai, hash, notConfigured } from '../_shared/ai.ts'
const DEPTS = [['T-shirts', 't-shirts'], ['Mugs', 'mugs'], ['Magic Cup', 'magic-cups'], ['Boards', 'boards'], ['Frames', 'frames'], ['Toner Products', 'toner-products'], ['Stationery & Office Supplies', 'stationery-office-supplies'], ['Printers & Photocopiers', 'printers-photocopiers'], ['Printing Materials & Consumables', 'printing-materials'], ['Printing Services', 'printing-services'], ['Branding & Promotional Products', 'branding-promotional'], ['Office Equipment', 'office-equipment']]
const S = { type: 'string' }, N = { type: 'number' }, B = { type: 'boolean' }
const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } })
const base = [
  fn('search_products', 'Search published YAKU products by keyword. Returns real prices and availability.', { query: S, department: S }, ['query']),
  fn('list_departments', 'List YAKU shopping departments.'),
  fn('list_print_services', 'List printing services with their material and finish options.'),
  fn('quote_print', 'Price a printing job from admin-configured rules. instant:false means a custom quotation is needed.', { service: S, qty: N, material: S, finish: S, design: B, express: B, delivery: B }, ['service', 'qty']),
  fn('list_sellers', 'List approved vendors and designers.'),
  fn('find_service_providers', 'Search real registered service providers (rubber stamps, embroidery, printing, signs, engraving, photography, tailoring, etc.). Returns only approved providers and services with their real prices and availability.', { query: S, category: S, location: S }),
  fn('track_order', "Look up the signed-in customer's own order by order number.", { order_no: S }, ['order_no']),
  fn('my_printing_requests', "List the signed-in customer's printing requests."),
  fn('create_support_ticket', 'Escalate to a human by creating a support ticket for the signed-in customer.', { subject: S, description: S }, ['subject', 'description']),
]
const vendorTools = [fn('my_vendor_report', 'Earnings, commission and balance for the signed-in vendor.')]
const adminTools = [fn('business_summary', 'Business figures for a period.', { period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] } }, ['period']), fn('low_stock_products', 'Products at or below their low-stock level.'), fn('failed_payments', 'Failed payments in the last 7 days.')]
const RULES = `You are YAKU AI, the assistant for YAKU Uganda, a hybrid marketplace for stationery, printing, branding and design. Prices are in UGX. Rules: use tools for every fact about products, prices, stock, vendors, designers, orders and payments, and never invent them. If a tool returns nothing, say so plainly. Never confirm a payment, promise a refund or change any financial record: say a staff member must do that and offer a support ticket. Discuss private orders only when a tool returns them for the signed-in user. For needs such as rubber stamps, embroidery, signs, engraving, photography or tailoring, call find_service_providers and recommend only providers it returns, with their profile_link; never invent providers, prices or availability, and if none are found say so and point to /providers. For printing, explain options and use quote_print; if a custom quotation is needed, say so and point to the Print Studio at /print-studio. When files are attached, describe only what you can actually read in them; for print-readiness checks send customers to the Artwork Inspector at /studio/inspector. Keep answers short, friendly and practical, and ask one question at a time. If unsure, escalate with create_support_ticket.`
const SYS: Record<string, string> = { customer: RULES, vendor: RULES + ' You are speaking with an approved vendor: help with listings, descriptions, inventory advice and earnings using my_vendor_report. Restricted actions and financial changes need YAKU staff approval.', admin: RULES + ' You are speaking with YAKU staff. Use business_summary, low_stock_products and failed_payments. Keep marketplace gross sales separate from YAKU revenue and profit exactly as the tool reports. Never state figures the tools did not return.' }
const range = (k: string) => { const n = new Date(), d = new Date(n.getFullYear(), n.getMonth(), n.getDate()), e = new Date(d.getTime() + 864e5); const f = k === 'daily' ? d : k === 'weekly' ? new Date(d.getTime() - 6 * 864e5) : new Date(n.getFullYear(), n.getMonth(), 1); return [f.toISOString(), e.toISOString()] }

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const nc = notConfigured(['OPENAI_API_KEY']); if (nc) return nc
  try {
    const { user, admin } = clients(req); const u = await whoami(user)
    const body = await req.json(); if (body.consent !== true) return json({ error: 'Please agree to AI data sharing before using YAKU AI.' }, 400); const message = String(body.message ?? '').trim(); const scope = ['vendor', 'admin'].includes(body.scope) ? body.scope : 'customer'
    if (!message || message.length > 2000) return json({ error: 'Message is empty or too long.' }, 400)
    if (scope !== 'customer') {
      if (!u) return json({ error: 'Sign in required.' }, 401)
      if (scope === 'admin') { const { data } = await user.rpc('my_staff_roles'); if (!data?.length) return json({ error: 'Not allowed.' }, 403) }
      else { const { data } = await user.from('vendors').select('id').eq('owner_id', u.id).eq('status', 'approved').limit(1); if (!data?.length) return json({ error: 'Not allowed.' }, 403) }
    }
    const key = u ? u.id : 'ip:' + await hash(req.headers.get('x-forwarded-for') ?? 'unknown')
    if (!await useQuota(admin, key, 'requests', Number(env(u ? 'AI_DAILY_LIMIT_USER' : 'AI_DAILY_LIMIT_ANON')) || (u ? 40 : 10))) return json({ error: 'Daily AI limit reached. Please try again tomorrow or contact support.' }, 429)
    let cid: string | null = body.conversation_id ?? null; let history: { role: string; content: string }[] = []
    if (u) {
      if (cid) { const { data } = await admin.from('ai_conversations').select('id').eq('id', cid).eq('user_id', u.id).maybeSingle(); if (!data) cid = null }
      if (!cid) { const { data } = await admin.from('ai_conversations').insert({ user_id: u.id, scope, title: message.slice(0, 60) }).select('id').single(); cid = data!.id }
      const { data } = await admin.from('ai_messages').select('role,content').eq('conversation_id', cid).in('role', ['user', 'assistant']).order('created_at', { ascending: false }).limit(12); history = (data ?? []).reverse()
    } else history = (Array.isArray(body.history) ? body.history : []).filter((m: any) => ['user', 'assistant'].includes(m?.role)).slice(-8).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))

    // ---- Attached files (signed-in users only; private bucket; type and size checked on the server) ----
    const atts = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, 3); let userContent: any = message; let attNote = ''; const skipped: string[] = []
    if (atts.length) {
      if (!u) return json({ error: 'Sign in to attach files.' }, 401)
      const parts: any[] = [{ type: 'text', text: message }]
      for (const a of atts) {
        const path = String(a.path ?? ''); const name = String(a.name ?? 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 80); attNote += ` [Attached: ${name}]`
        if (!path.startsWith(u.id + '/') || path.includes('..')) return json({ error: 'Invalid attachment.' }, 400)
        const { data: file } = await admin.storage.from('ai-attachments').download(path); if (!file) { skipped.push(name); continue }
        const b = new Uint8Array(await file.arrayBuffer()); if (b.length > 10 * 1024 * 1024) { skipped.push(name); continue }
        const head = String.fromCharCode(...b.slice(0, 4)); const lower = name.toLowerCase()
        const b64 = () => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s) }
        const img = b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : head === 'RIFF' ? 'image/webp' : ''
        if (head === '%PDF') parts.push({ type: 'file', file: { filename: name, file_data: `data:application/pdf;base64,${b64()}` } })
        else if (img && b.length <= 4 * 1024 * 1024) parts.push({ type: 'image_url', image_url: { url: `data:${img};base64,${b64()}` } })
        else if (!img && /\.(txt|csv|md|json)$/.test(lower) && !b.slice(0, 2000).includes(0)) parts.push({ type: 'text', text: `Contents of ${name}:\n` + new TextDecoder().decode(b).slice(0, 12000) })
        else skipped.push(name)
      }
      if (skipped.length) parts.push({ type: 'text', text: `The customer also attached files you cannot read (${skipped.join(', ')}). Say so plainly and suggest a PDF, image or text file; never guess their contents.` })
      userContent = parts
    }
    const tools = [...base, ...(scope === 'vendor' ? vendorTools : []), ...(scope === 'admin' ? adminTools : [])]; const audit: string[] = []
    const runTool = async (name: string, a: any) => {
      audit.push(`${name}(${JSON.stringify(a).slice(0, 200)})`)
      switch (name) {
        case 'search_products': { let q = user.from('products').select('title,department,price_ugx,flash_price_ugx,stock,kind').eq('status', 'published').ilike('title', `%${String(a.query).replace(/[%,]/g, '')}%`).limit(8); if (a.department) q = q.eq('department', a.department)
          const { data, error } = await q; if (error) throw error; return (data ?? []).map((p: any) => ({ title: p.title, department: p.department, price_ugx: p.price_ugx, promo_price_ugx: p.flash_price_ugx, availability: p.kind === 'service' ? 'service' : p.stock > 0 ? 'in stock' : 'out of stock' })) }
        case 'list_departments': { const { data } = await user.from('departments').select('name,slug').eq('active', true).order('sort_order'); return data?.length ? data : DEPTS.map(([name, slug]) => ({ name, slug })) }
        case 'list_print_services': { const { data, error } = await user.from('print_services').select('slug,name,min_qty,price_rules(kind,name,amount)').eq('active', true); if (error) throw error; return (data ?? []).map((s: any) => ({ ...s, price_rules: s.price_rules.filter((r: any) => ['material', 'finish'].includes(r.kind)) })) }
        case 'quote_print': { const { data, error } = await user.rpc('quote_print', { p_service: a.service, p_qty: a.qty, p_material: a.material ?? null, p_finish: a.finish ?? null, p_design: !!a.design, p_express: !!a.express, p_delivery: !!a.delivery }); if (error) throw error; return data }
        case 'list_sellers': { const v = await user.from('vendors').select('name').eq('approved', true).limit(20); const d = await user.from('designers').select('name,specialty').eq('approved', true).limit(20); return { vendors: v.data ?? [], designers: d.data ?? [] } }
        case 'find_service_providers': { const { data, error } = await user.rpc('search_services', { p_q: a.query ? String(a.query).replace(/[%,]/g, '') : null, p_category: a.category ?? null, p_location: a.location ? String(a.location).replace(/[%,]/g, '') : null }); if (error) throw error; return (data ?? []).slice(0, 8).map((r: any) => ({ provider: r.business_name, verified: r.verified, location: r.location, service: r.title, type: r.category, price: r.price_type === 'quote' || r.price_from_ugx == null ? 'quote on request' : `${r.price_type === 'from' ? 'from ' : ''}UGX ${r.price_from_ugx}`, min_qty: r.min_qty, production_days: r.production_days, available: r.available, rating: r.rating, profile_link: `/providers/${r.provider_id}` })) }
        case 'track_order': { if (!u) return { error: 'The customer must sign in first.' }; const { data } = await user.from('orders').select('order_no,status,payment_status,delivery_status,total,created_at').eq('order_no', String(a.order_no).trim()).maybeSingle(); return data ?? { error: 'No order with that number on this account.' } }
        case 'my_printing_requests': { if (!u) return { error: 'The customer must sign in first.' }; const { data } = await user.from('printing_requests').select('request_no,product_type,quantity,quote_amount,quote_status,payment_status,production_status,delivery_status').order('created_at', { ascending: false }).limit(10); return data ?? [] }
        case 'create_support_ticket': { if (!u) return { error: 'The customer must sign in first.' }; const { data, error } = await user.from('tickets').insert({ user_id: u.id, email: u.email, category: 'assistant', subject: String(a.subject).slice(0, 120), description: String(a.description).slice(0, 2000) }).select('ticket_no').maybeSingle(); if (error) throw error; return { created: true, ticket_no: data?.ticket_no } }
        case 'my_vendor_report': { const { data, error } = await user.rpc('vendor_report'); if (error) throw error; return data }
        case 'business_summary': { const [f, t] = range(a.period); const { data, error } = await user.rpc('dashboard_summary', { p_from: f, p_to: t }); if (error) throw error; return data }
        case 'low_stock_products': { const { data, error } = await user.from('products').select('title,stock,low_stock_threshold').eq('status', 'published').limit(300); if (error) throw error; return (data ?? []).filter((p: any) => p.stock <= p.low_stock_threshold) }
        case 'failed_payments': { const { data, error } = await user.from('payments').select('provider,provider_ref,amount,created_at').eq('status', 'failed').gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString()).limit(50); if (error) throw error; return data }
      }
      return { error: 'Unknown tool' }
    }
    const msgs: any[] = [{ role: 'system', content: SYS[scope] }, ...history, { role: 'user', content: userContent }]; let reply = '', tin = 0, tout = 0
    for (let i = 0; i < 4; i++) {
      const r = await openai('chat/completions', { model: env('OPENAI_MODEL') || 'gpt-4o-mini', messages: msgs, tools, temperature: 0.3 })
      tin += r.usage?.prompt_tokens ?? 0; tout += r.usage?.completion_tokens ?? 0
      const c = r.choices[0].message; msgs.push(c)
      if (!c.tool_calls?.length) { reply = c.content ?? ''; break }
      for (const t of c.tool_calls) { let out; try { out = await runTool(t.function.name, JSON.parse(t.function.arguments || '{}')) } catch (e) { out = { error: String((e as Error).message ?? e) } }; msgs.push({ role: 'tool', tool_call_id: t.id, content: JSON.stringify(out).slice(0, 6000) }) }
    }
    if (!reply) reply = 'Sorry, I could not finish that. Please try again or contact support.'
    await admin.rpc('ai_add_tokens', { p_key: key, p_in: tin, p_out: tout })
    if (u && cid) await admin.from('ai_messages').insert([{ conversation_id: cid, role: 'user', content: message + attNote }, ...audit.map(a => ({ conversation_id: cid, role: 'tool', content: a })), { conversation_id: cid, role: 'assistant', content: reply }])
    return json({ reply, conversation_id: cid })
  } catch (e) { console.error(e); return json({ error: 'The AI service is unavailable right now. Please try again shortly.' }, 502) }
})
