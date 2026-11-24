-- Phase 4: YAKU AI, Print Studio, pricing. Run after phase3_business.sql.
create table print_services(id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, active boolean not null default true, min_qty integer not null default 1);
create table price_rules(id uuid primary key default gen_random_uuid(), service_id uuid not null references print_services on delete cascade,
  kind text not null check (kind in ('unit_tier','material','finish','design','setup','express_pct','delivery','discount_pct')),
  name text not null default '', amount numeric not null check (amount >= 0), qty_from integer, qty_to integer, active boolean not null default true);
-- Service names only. NO prices are seeded: until an admin adds rules, every quote is "custom quotation needed".
insert into print_services(slug,name) values ('business-cards','Business cards'),('flyers','Flyers'),('posters','Posters'),('banners','Banners'),('stickers','Stickers'),('brochures','Brochures'),
 ('invitation-cards','Invitation cards'),('t-shirt-printing','T-shirt printing'),('mug-printing','Mug printing'),('packaging','Packaging'),('dtf-printing','DTF printing');
create table ai_conversations(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, scope text not null check (scope in ('customer','vendor','admin')), title text, created_at timestamptz default now());
create table ai_messages(id uuid primary key default gen_random_uuid(), conversation_id uuid not null references ai_conversations on delete cascade, role text not null check (role in ('user','assistant','tool')), content text not null, created_at timestamptz default now());
create table ai_usage(key text not null, day date not null default current_date, requests integer not null default 0, images integer not null default 0, input_tokens bigint not null default 0, output_tokens bigint not null default 0, primary key (key, day));
create table artworks(id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles on delete cascade, path text not null, original_name text, mime text, size_bytes integer,
  source text not null default 'upload' check (source in ('upload','ai_design')), prompt text, created_at timestamptz default now());
create table artwork_inspections(id uuid primary key default gen_random_uuid(), artwork_id uuid not null references artworks on delete cascade, metrics jsonb, issues jsonb, ai_review jsonb, created_at timestamptz default now());
create table artwork_versions(id uuid primary key default gen_random_uuid(), artwork_id uuid not null references artworks on delete cascade, path text not null, note text, created_at timestamptz default now());
alter table printing_requests add column service_slug text, add column options jsonb, add column quote_breakdown jsonb, add column artwork_id uuid references artworks,
  add column artwork_version_id uuid references artwork_versions, add column artwork_approved boolean not null default false, add column artwork_approved_at timestamptz;

create function ai_add_tokens(p_key text, p_in integer, p_out integer) returns void language sql security definer set search_path=public as
$$ insert into ai_usage(key,day,input_tokens,output_tokens) values (p_key,current_date,p_in,p_out) on conflict (key,day) do update set input_tokens=ai_usage.input_tokens+p_in, output_tokens=ai_usage.output_tokens+p_out $$;
revoke execute on function ai_add_tokens(text,integer,integer) from public, anon, authenticated;

-- Price calculator: only admin-configured rules are used. Anything missing means a custom quotation, never a guess.
create function quote_print(p_service text, p_qty integer, p_material text default null, p_finish text default null, p_design boolean default false, p_express boolean default false, p_delivery boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s print_services; unit numeric; mat numeric := 0; fin numeric := 0; des numeric := 0; setup numeric; dlv numeric := 0; expp numeric := 0; dsc numeric; da numeric; ex numeric := 0; sub numeric; lines jsonb := '[]';
begin
  select * into s from print_services where slug = p_service and active;
  if not found then return jsonb_build_object('instant', false, 'reason', 'Unknown service'); end if;
  if p_qty is null or p_qty < s.min_qty then return jsonb_build_object('instant', false, 'reason', 'Minimum quantity is ' || s.min_qty); end if;
  select amount into unit from price_rules where service_id = s.id and kind = 'unit_tier' and active and p_qty >= qty_from and (qty_to is null or p_qty <= qty_to) order by qty_from desc limit 1;
  if unit is null then return jsonb_build_object('instant', false, 'reason', 'No standard price is set for this quantity, so a custom quotation is needed'); end if;
  if coalesce(p_material,'') <> '' then select amount into mat from price_rules where service_id = s.id and kind = 'material' and active and lower(name) = lower(p_material) limit 1;
    if not found then return jsonb_build_object('instant', false, 'reason', 'No standard price for that material'); end if; end if;
  if coalesce(p_finish,'') <> '' then select amount into fin from price_rules where service_id = s.id and kind = 'finish' and active and lower(name) = lower(p_finish) limit 1;
    if not found then return jsonb_build_object('instant', false, 'reason', 'No standard price for that finish'); end if; end if;
  if p_design then select amount into des from price_rules where service_id = s.id and kind = 'design' and active limit 1;
    if not found then return jsonb_build_object('instant', false, 'reason', 'No standard design charge is set'); end if; end if;
  select coalesce(max(amount),0) into setup from price_rules where service_id = s.id and kind = 'setup' and active;
  lines := lines || jsonb_build_array(jsonb_build_object('label', 'Printing ('||p_qty||' × UGX '||unit||')', 'amount', round(unit*p_qty)));
  if mat > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label','Material: '||p_material,'amount',round(mat*p_qty))); end if;
  if fin > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label','Finishing: '||p_finish,'amount',round(fin*p_qty))); end if;
  if des > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label','Design charge','amount',round(des))); end if;
  if setup > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label','Production charge','amount',round(setup))); end if;
  sub := (unit + mat + fin) * p_qty + des + setup;
  select coalesce(max(amount),0) into dsc from price_rules where service_id = s.id and kind = 'discount_pct' and active and p_qty >= coalesce(qty_from,0) and (qty_to is null or p_qty <= qty_to);
  da := round(((unit + mat + fin) * p_qty) * dsc / 100);
  if da > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label','Discount ('||dsc||'%)','amount',-da)); end if;
  if p_express then select amount into expp from price_rules where service_id = s.id and kind = 'express_pct' and active limit 1;
    if not found then return jsonb_build_object('instant', false, 'reason', 'No standard express fee is set'); end if;
    ex := round((sub - da) * expp / 100); lines := lines || jsonb_build_array(jsonb_build_object('label','Express production ('||expp||'%)','amount',ex)); end if;
  if p_delivery then select amount into dlv from price_rules where service_id = s.id and kind = 'delivery' and active limit 1;
    if not found then return jsonb_build_object('instant', false, 'reason', 'No standard delivery charge is set'); end if;
    lines := lines || jsonb_build_array(jsonb_build_object('label','Delivery','amount',round(dlv))); end if;
  return jsonb_build_object('instant', true, 'lines', lines, 'total', round(sub - da + ex + dlv));
end $$;

create function submit_print_request(p_service text, p_qty integer, p_material text, p_finish text, p_design boolean, p_express boolean, p_delivery boolean, p_details text, p_artwork uuid, p_version uuid, p_phone text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare q jsonb; s print_services; pr profiles; rid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into pr from profiles where id = auth.uid();
  select * into s from print_services where slug = p_service and active; if not found then raise exception 'Unknown service'; end if;
  if p_artwork is not null and not exists (select 1 from artworks where id = p_artwork and owner_id = auth.uid()) then raise exception 'Artwork not found'; end if;
  if p_version is not null and not exists (select 1 from artwork_versions v join artworks a on a.id = v.artwork_id where v.id = p_version and a.id = p_artwork and a.owner_id = auth.uid()) then raise exception 'Version not found'; end if;
  q := quote_print(p_service, p_qty, p_material, p_finish, p_design, p_express, p_delivery);   -- recomputed on the server; the browser cannot set a price
  insert into printing_requests(customer_id,name,email,phone,product_type,specs,quantity,service_slug,options,quote_breakdown,quote_amount,quote_status,artwork_id,artwork_version_id)
  values (auth.uid(), pr.full_name, pr.email, p_phone, s.name, p_details, p_qty, p_service,
    jsonb_build_object('material',p_material,'finish',p_finish,'design',p_design,'express',p_express,'delivery',p_delivery), q,
    case when (q->>'instant')::boolean then (q->>'total')::int end, case when (q->>'instant')::boolean then 'quoted' else 'none' end, p_artwork, p_version) returning id into rid;
  return rid;
end $$;
create function approve_artwork(p_request uuid, p_version uuid default null) returns void language sql security definer set search_path=public as $$
  update printing_requests set artwork_approved = true, artwork_approved_at = now(), artwork_version_id = coalesce(p_version, artwork_version_id)
  where id = p_request and customer_id = auth.uid() and artwork_id is not null $$;
-- Production now also requires the customer's explicit artwork approval.
create or replace function printing_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.production_status in ('in_production','quality_check','ready','delivered') and (new.quote_status <> 'approved' or new.payment_status <> 'verified' or (new.artwork_id is not null and not new.artwork_approved)) then
    raise exception 'Production needs an approved quote, verified payment and approved artwork'; end if;
  if new.production_status in ('ready','delivered') and not coalesce(new.qc_passed,false) then raise exception 'Quality check must pass first'; end if;
  if new.payment_status='verified' and old.payment_status <> 'verified' then new.payment_verified_by := auth.uid(); new.payment_verified_at := now(); end if;
  new.updated_at := now(); return new; end $$;

alter table print_services enable row level security; alter table price_rules enable row level security; alter table ai_conversations enable row level security; alter table ai_messages enable row level security;
alter table ai_usage enable row level security; alter table artworks enable row level security; alter table artwork_inspections enable row level security; alter table artwork_versions enable row level security;
create policy "services read" on print_services for select using (active or has_staff(array['printing_manager']));
create policy "services write" on print_services for all using (has_staff(array['printing_manager'])) with check (has_staff(array['printing_manager']));
create policy "rules read" on price_rules for select using (active or has_staff(array['printing_manager']));
create policy "rules write" on price_rules for all using (has_staff(array['printing_manager'])) with check (has_staff(array['printing_manager']));
create policy "own conversations" on ai_conversations for select using (user_id = auth.uid());
create policy "own messages" on ai_messages for select using (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "usage read" on ai_usage for select using (has_staff(array['finance_manager']));
create policy "own artworks" on artworks for select using (owner_id = auth.uid() or has_staff(array['printing_manager','support']));
create policy "add artworks" on artworks for insert with check (owner_id = auth.uid());   -- no update/delete policy: originals are immutable
create policy "inspections read" on artwork_inspections for select using (exists (select 1 from artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or has_staff(array['printing_manager','support']))));
create policy "versions read" on artwork_versions for select using (exists (select 1 from artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or has_staff(array['printing_manager','support']))));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('artwork','artwork',false,15728640,array['image/png','image/jpeg','application/pdf']) on conflict do nothing;
create policy "upload own artwork" on storage.objects for insert to authenticated with check (bucket_id = 'artwork' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own artwork" on storage.objects for select to authenticated using (bucket_id = 'artwork' and ((storage.foldername(name))[1] = auth.uid()::text or has_staff(array['printing_manager','support'])));
