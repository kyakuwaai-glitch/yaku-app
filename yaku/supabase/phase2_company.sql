-- Phase 2: company information, forms, campaigns. Run after schema.sql.
create table site_settings(key text primary key, value text, updated_at timestamptz default now());
create table pages(slug text primary key, title text not null, description text, body text not null, updated_at timestamptz default now());
create table submissions(
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact','career','ipr','dispute','return','report','partner')),
  user_id uuid references profiles on delete set null, data jsonb not null, files text[] default '{}',
  status text not null default 'new' check (status in ('new','in_review','resolved','rejected')),
  resolution text, created_at timestamptz default now(), updated_at timestamptz default now());
create table campaigns(
  id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('flash_sale','black_friday')),
  title text not null, starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
  active boolean not null default false, created_at timestamptz default now());
create table campaign_items(
  id uuid primary key default gen_random_uuid(), campaign_id uuid references campaigns on delete cascade,
  product_id uuid references products on delete cascade, promo_price_ugx integer not null check (promo_price_ugx > 0),
  stock_limit integer check (stock_limit >= 0), sold integer not null default 0, unique (campaign_id, product_id));
create function check_promo() returns trigger language plpgsql as $$
begin if new.promo_price_ugx >= (select price_ugx from products where id = new.product_id)
  then raise exception 'Promotional price must be below the regular price'; end if; return new; end $$;
create trigger campaign_items_check before insert or update on campaign_items for each row execute function check_promo();
alter table site_settings enable row level security; alter table pages enable row level security;
alter table submissions enable row level security; alter table campaigns enable row level security; alter table campaign_items enable row level security;
create policy "public read settings" on site_settings for select using (true);
create policy "admin settings" on site_settings for all using (is_admin()) with check (is_admin());
create policy "public read pages" on pages for select using (true);
create policy "admin pages" on pages for all using (is_admin()) with check (is_admin());
create policy "anyone can submit" on submissions for insert to anon, authenticated
  with check (status = 'new' and resolution is null and (user_id is null or user_id = auth.uid()));
create policy "read own or admin" on submissions for select using (user_id = auth.uid() or is_admin());
create policy "admin update submissions" on submissions for update using (is_admin());
create policy "admin delete submissions" on submissions for delete using (is_admin());
create policy "live campaigns" on campaigns for select using ((active and ends_at > now()) or is_admin());
create policy "admin campaigns" on campaigns for all using (is_admin()) with check (is_admin());
create policy "live campaign items" on campaign_items for select using (is_admin() or exists (select 1 from campaigns c where c.id = campaign_id and c.active and c.starts_at <= now() and c.ends_at > now()));
create policy "admin campaign items" on campaign_items for all using (is_admin()) with check (is_admin());
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false) on conflict do nothing;
create policy "upload submission files" on storage.objects for insert to anon, authenticated with check (bucket_id = 'submissions');
create policy "admin read submission files" on storage.objects for select using (bucket_id = 'submissions' and is_admin());
