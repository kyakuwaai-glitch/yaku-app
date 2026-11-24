-- Phase 8 (additive): lets store managers edit the storefront from the Business Console. Run after phase7.
create table banners(id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('hero','promo','strip','home','department')),
  title text not null, subtitle text, button_text text, link_url text check (link_url is null or link_url ~ '^(/|https://)'), image_path text,
  sort_order integer not null default 0, active boolean not null default true, starts_at timestamptz, ends_at timestamptz, clicks integer not null default 0, created_at timestamptz default now());
create table departments(id uuid primary key default gen_random_uuid(), slug text unique not null check (slug ~ '^[a-z0-9-]+$'), name text not null, sort_order integer not null default 0, active boolean not null default true);
insert into departments(slug,name,sort_order) values ('t-shirts','T-shirts',1),('mugs','Mugs',2),('magic-cups','Magic Cup',3),('boards','Boards',4),('frames','Frames',5),('toner-products','Toner Products',6),
 ('stationery-office-supplies','Stationery & Office Supplies',7),('printers-photocopiers','Printers & Photocopiers',8),('printing-materials','Printing Materials & Consumables',9),
 ('printing-services','Printing Services',10),('branding-promotional','Branding & Promotional Products',11),('office-equipment','Office Equipment',12);
create table home_sections(key text primary key, title text not null, visible boolean not null default true, sort_order integer not null default 0);
-- (no home_sections rows are seeded: the storefront uses its built-in order and titles until the Homepage tab is saved)
create function banner_click(p_id uuid) returns void language sql security definer set search_path=public as $$ update banners set clicks = clicks + 1 where id = p_id and active $$;
grant execute on function banner_click(uuid) to anon, authenticated;
alter table banners enable row level security; alter table departments enable row level security; alter table home_sections enable row level security;
create policy "banners live" on banners for select using ((active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or has_staff(array['store_manager']));
create policy "banners staff" on banners for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
create policy "departments read" on departments for select using (active or has_staff(array['store_manager']));
create policy "departments staff" on departments for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
create policy "home sections read" on home_sections for select using (true);
create policy "home sections staff" on home_sections for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
-- Store managers may also edit pages, contact settings and flash-sale campaigns (additive policies).
create policy "store manager pages" on pages for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
create policy "store manager settings" on site_settings for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
create policy "store manager campaigns" on campaigns for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
create policy "store manager campaign items" on campaign_items for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('store-media','store-media',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict do nothing;
create policy "staff upload store media" on storage.objects for insert to authenticated with check (bucket_id = 'store-media' and has_staff(array['store_manager']));
create policy "staff update store media" on storage.objects for update to authenticated using (bucket_id = 'store-media' and has_staff(array['store_manager']));
create policy "staff delete store media" on storage.objects for delete to authenticated using (bucket_id = 'store-media' and has_staff(array['store_manager']));
do $$ declare t text; begin foreach t in array array['banners','departments','home_sections'] loop
  execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_trg()', t); end loop; end $$;
