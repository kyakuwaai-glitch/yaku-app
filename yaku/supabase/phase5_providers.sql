-- Phase 5 (ADDITIVE): Service providers. Run after phase4_ai.sql. No existing table is altered or reset.
create table service_categories(id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
  status text not null default 'pending' check (status in ('approved','pending','rejected')), requested_by uuid references profiles on delete set null, created_at timestamptz default now());
insert into service_categories(slug,name,status) values ('rubber-stamps','Rubber stamp making','approved'),('embroidery','Embroidery','approved'),('printing','Printing','approved'),('graphic-design','Graphic design','approved'),
 ('branding','Branding','approved'),('sign-making','Sign making','approved'),('engraving','Engraving','approved'),('photography','Photography','approved'),('tailoring','Tailoring','approved'),
 ('dtf-printing','DTF printing','approved'),('lamination','Lamination','approved'),('binding','Binding','approved');
create sequence service_order_seq;
create table providers(id uuid primary key default gen_random_uuid(), owner_id uuid unique not null references profiles on delete cascade, business_name text not null, description text, location text,
  working_areas text[] not null default '{}', phone text, email text, logo_path text, status text not null default 'pending' check (status in ('pending','approved','suspended')),
  verified boolean not null default false, commission_pct numeric(5,2) check (commission_pct between 0 and 100), created_at timestamptz default now(), updated_at timestamptz default now());
create table provider_services(id uuid primary key default gen_random_uuid(), provider_id uuid not null references providers on delete cascade, category_id uuid references service_categories, custom_name text,
  title text not null, description text, price_type text not null default 'quote' check (price_type in ('fixed','from','quote')), price_from_ugx integer check (price_from_ugx >= 0),
  min_qty integer not null default 1 check (min_qty >= 1), production_days integer check (production_days >= 0), available boolean not null default true, photos text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz default now());
create table provider_portfolio(id uuid primary key default gen_random_uuid(), provider_id uuid not null references providers on delete cascade, image_path text not null, caption text, created_at timestamptz default now());
create table service_orders(id uuid primary key default gen_random_uuid(), order_no text unique not null default 'SV-'||lpad(nextval('service_order_seq')::text,6,'0'),
  customer_id uuid not null references profiles, customer_name text, provider_id uuid not null references providers, service_id uuid references provider_services on delete set null,
  details text not null, quantity integer check (quantity > 0), needed_by date, contact_phone text,
  status text not null default 'new' check (status in ('new','quoted','accepted','declined','in_progress','completed','cancelled')),
  quote_amount integer check (quote_amount >= 0), quote_note text, quote_days integer, payment_status text not null default 'unpaid' check (payment_status in ('unpaid','verified')), payment_ref text,
  commission_pct numeric(5,2), commission_amount integer, refund_amount integer not null default 0 check (refund_amount >= 0), completed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table service_order_events(id uuid primary key default gen_random_uuid(), order_id uuid not null references service_orders on delete cascade, status text, note text, actor uuid default auth.uid(), created_at timestamptz default now());
create table provider_reviews(id uuid primary key default gen_random_uuid(), order_id uuid unique not null references service_orders, provider_id uuid not null references providers, customer_id uuid not null references profiles,
  rating integer not null check (rating between 1 and 5), comment text, created_at timestamptz default now());
create table provider_settlements(id uuid primary key default gen_random_uuid(), provider_id uuid not null references providers, amount integer not null check (amount > 0), reference text not null, note text,
  paid_at timestamptz default now(), recorded_by uuid default auth.uid(), unique (provider_id, reference));

-- Providers can never approve, verify or set the commission for themselves.
create function providers_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not has_staff(array['vendor_manager']) then
    if tg_op = 'INSERT' then new.status := 'pending'; new.verified := false; new.commission_pct := null;
    else new.status := old.status; new.verified := old.verified; new.commission_pct := old.commission_pct; new.owner_id := old.owner_id; end if;
  end if; new.updated_at := now(); return new; end $$;
create trigger providers_guard_trg before insert or update on providers for each row execute function providers_guard();
create function providers_new() returns trigger language plpgsql security definer set search_path=public as $$
begin perform notify('provider','New service provider application',new.business_name,'/console',array['vendor_manager']); return null; end $$;
create trigger providers_ins after insert on providers for each row execute function providers_new();
-- Services in an approved category go live (once the provider is approved); anything else waits for review.
create function pservices_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare cat text;
begin
  if not has_staff(array['vendor_manager']) then
    select status into cat from service_categories where id = new.category_id;
    if tg_op = 'INSERT' then new.status := case when cat = 'approved' then 'approved' else 'pending' end;
    else new.status := old.status;
      if new.title is distinct from old.title or new.description is distinct from old.description or new.category_id is distinct from old.category_id then
        new.status := case when cat = 'approved' then 'approved' else 'pending' end; end if; end if;
  end if; return new; end $$;
create trigger pservices_guard_trg before insert or update on provider_services for each row execute function pservices_guard();
create function pservices_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status = 'pending' then perform notify('provider','Service awaiting review',new.title,'/console',array['vendor_manager']); end if; return null; end $$;
create trigger pservices_ins after insert on provider_services for each row execute function pservices_notify();

-- Every request / quotation / order change goes through these functions, so the rules cannot be bypassed from the browser.
create function request_service(p_provider uuid, p_service uuid, p_details text, p_qty integer, p_needed date, p_phone text) returns text
language plpgsql security definer set search_path=public as $$
declare rid uuid; no text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from providers where id = p_provider and status = 'approved') then raise exception 'Provider not available'; end if;
  if exists (select 1 from providers where id = p_provider and owner_id = auth.uid()) then raise exception 'You cannot request your own service'; end if;
  if p_service is not null and not exists (select 1 from provider_services where id = p_service and provider_id = p_provider and status = 'approved') then raise exception 'Service not available'; end if;
  if coalesce(trim(p_details),'') = '' then raise exception 'Describe what you need'; end if;
  insert into service_orders(customer_id,customer_name,provider_id,service_id,details,quantity,needed_by,contact_phone)
  values (auth.uid(),(select full_name from profiles where id = auth.uid()),p_provider,p_service,left(p_details,2000),p_qty,p_needed,p_phone) returning id, order_no into rid, no;
  insert into service_order_events(order_id,status,note) values (rid,'new','Request submitted'); return no; end $$;
create function service_order_action(p_order uuid, p_action text, p_amount integer default null, p_days integer default null, p_note text default null) returns void
language plpgsql security definer set search_path=public as $$
declare o service_orders; pr providers; me uuid := auth.uid(); is_prov boolean; is_cust boolean; pct numeric; ns text;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into o from service_orders where id = p_order for update; if not found then raise exception 'Order not found'; end if;
  select * into pr from providers where id = o.provider_id; is_prov := pr.owner_id = me; is_cust := o.customer_id = me;
  if p_action = 'quote' and is_prov and pr.status = 'approved' and o.status in ('new','quoted') then
    if p_amount is null or p_amount < 0 then raise exception 'Enter an amount'; end if;
    update service_orders set status='quoted', quote_amount=p_amount, quote_days=p_days, quote_note=p_note where id=o.id; ns := 'quoted';
  elsif p_action = 'decline' and is_prov and o.status in ('new','quoted') then update service_orders set status='declined' where id=o.id; ns := 'declined';
  elsif p_action = 'accept' and is_cust and o.status = 'quoted' then update service_orders set status='accepted' where id=o.id; ns := 'accepted';
  elsif p_action = 'reject' and is_cust and o.status = 'quoted' then update service_orders set status='declined' where id=o.id; ns := 'declined';
  elsif p_action = 'cancel' and is_cust and o.status in ('new','quoted','accepted') then update service_orders set status='cancelled' where id=o.id; ns := 'cancelled';
  elsif p_action = 'start' and is_prov and o.status = 'accepted' then update service_orders set status='in_progress' where id=o.id; ns := 'in_progress';
  elsif p_action = 'complete' and is_prov and o.status in ('accepted','in_progress') then
    pct := coalesce(pr.commission_pct, (select nullif(value,'')::numeric from site_settings where key = 'provider_commission_pct'), 0);
    update service_orders set status='completed', completed_at=now(), commission_pct=pct, commission_amount=round(coalesce(o.quote_amount,0)*pct/100) where id=o.id; ns := 'completed';
  elsif p_action = 'note' and (is_prov or is_cust) then ns := o.status;
  elsif p_action = 'verify_payment' and has_staff(array['vendor_manager','finance_manager']) and o.status in ('accepted','in_progress','completed') then
    if coalesce(trim(p_note),'') = '' then raise exception 'Payment reference required'; end if;
    update service_orders set payment_status='verified', payment_ref=trim(p_note) where id=o.id; ns := o.status;
  elsif p_action = 'refund' and has_staff(array['finance_manager']) and coalesce(p_amount,0) > 0 and p_amount <= coalesce(o.quote_amount,0) then
    update service_orders set refund_amount=p_amount where id=o.id; ns := o.status;
  else raise exception 'That action is not allowed right now'; end if;
  update service_orders set updated_at = now() where id = o.id;
  insert into service_order_events(order_id,status,note) values (o.id,ns,coalesce(p_note,p_action)); end $$;
-- Earnings, commission, refunds and settlements are kept apart. Only completed orders with VERIFIED payment count.
create function provider_report(p_provider uuid default null) returns table(provider_id uuid, business_name text, gross numeric, commission numeric, refunds numeric, earnings numeric, settled numeric, balance numeric, commission_not_set bigint)
language sql security definer stable set search_path=public as $$
  select p.id, p.business_name, g.gross, g.comm, g.ref, g.gross-g.comm-g.ref, s.settled, g.gross-g.comm-g.ref-s.settled, g.unset from providers p
  cross join lateral (select coalesce(sum(o.quote_amount),0) gross, coalesce(sum(o.commission_amount),0) comm, coalesce(sum(o.refund_amount),0) ref, count(*) filter (where o.commission_pct = 0) unset
    from service_orders o where o.provider_id = p.id and o.status = 'completed' and o.payment_status = 'verified') g
  cross join lateral (select coalesce(sum(amount),0) settled from provider_settlements where provider_id = p.id) s
  where (p_provider is null or p.id = p_provider) and (has_staff(array['vendor_manager','finance_manager']) or p.owner_id = auth.uid()) $$;
create function check_provider_settlement() returns trigger language plpgsql security definer set search_path=public as $$
declare b numeric; begin select balance into b from provider_report(new.provider_id);
  if new.amount > coalesce(b,0) then raise exception 'Settlement exceeds the provider balance'; end if; return new; end $$;
create trigger provider_settlement_check before insert on provider_settlements for each row execute function check_provider_settlement();
-- Discovery (runs with the caller's permissions, so only approved providers and services are ever returned).
create function search_services(p_q text default null, p_category text default null, p_location text default null)
returns table(service_id uuid, provider_id uuid, business_name text, location text, verified boolean, logo_path text, category text, title text, description text, price_type text, price_from_ugx integer, min_qty integer, production_days integer, available boolean, rating numeric, reviews bigint, photo text)
language sql stable set search_path=public as $$
  select s.id, p.id, p.business_name, p.location, p.verified, p.logo_path, coalesce(c.name, s.custom_name), s.title, s.description, s.price_type, s.price_from_ugx, s.min_qty, s.production_days, s.available,
    (select round(avg(r.rating),1) from provider_reviews r where r.provider_id = p.id), (select count(*) from provider_reviews r where r.provider_id = p.id), s.photos[1]
  from provider_services s join providers p on p.id = s.provider_id left join service_categories c on c.id = s.category_id
  where s.status = 'approved' and p.status = 'approved' and (p_category is null or c.slug = p_category)
    and (p_q is null or s.title ilike '%'||p_q||'%' or s.description ilike '%'||p_q||'%' or c.name ilike '%'||p_q||'%' or p.business_name ilike '%'||p_q||'%')
    and (p_location is null or p.location ilike '%'||p_location||'%' or exists (select 1 from unnest(p.working_areas) a where a ilike '%'||p_location||'%'))
  order by p.verified desc, s.available desc limit 50 $$;

do $$ declare t text; begin foreach t in array array['providers','provider_services','service_categories','service_orders','provider_settlements'] loop
  execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_trg()', t); end loop; end $$;

alter table service_categories enable row level security; alter table providers enable row level security; alter table provider_services enable row level security; alter table provider_portfolio enable row level security;
alter table service_orders enable row level security; alter table service_order_events enable row level security; alter table provider_reviews enable row level security; alter table provider_settlements enable row level security;
create policy "categories read" on service_categories for select using (status = 'approved' or requested_by = auth.uid() or has_staff(array['vendor_manager']));
create policy "request category" on service_categories for insert to authenticated with check (status = 'pending' and requested_by = auth.uid());
create policy "staff categories" on service_categories for all using (has_staff(array['vendor_manager'])) with check (has_staff(array['vendor_manager']));
create policy "providers read" on providers for select using (status = 'approved' or owner_id = auth.uid() or has_staff(array['vendor_manager','finance_manager']));
create policy "create own provider" on providers for insert to authenticated with check (owner_id = auth.uid());
create policy "update own provider" on providers for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "staff providers" on providers for all using (has_staff(array['vendor_manager'])) with check (has_staff(array['vendor_manager']));
create policy "services read" on provider_services for select using ((status = 'approved' and exists (select 1 from providers p where p.id = provider_id and p.status = 'approved'))
  or exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()) or has_staff(array['vendor_manager']));
create policy "own services" on provider_services for all using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid())) with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));
create policy "staff services" on provider_services for all using (has_staff(array['vendor_manager'])) with check (has_staff(array['vendor_manager']));
create policy "portfolio read" on provider_portfolio for select using (exists (select 1 from providers p where p.id = provider_id and (p.status = 'approved' or p.owner_id = auth.uid())) or has_staff(array['vendor_manager']));
create policy "own portfolio" on provider_portfolio for all using (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid())) with check (exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));
create policy "orders read" on service_orders for select using (customer_id = auth.uid() or exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()) or has_staff(array['vendor_manager','finance_manager']));
create policy "order events read" on service_order_events for select using (exists (select 1 from service_orders o where o.id = order_id and (o.customer_id = auth.uid() or exists (select 1 from providers p where p.id = o.provider_id and p.owner_id = auth.uid()))) or has_staff(array['vendor_manager','finance_manager']));
create policy "reviews read" on provider_reviews for select using (exists (select 1 from providers p where p.id = provider_id and p.status = 'approved') or customer_id = auth.uid() or has_staff(array['vendor_manager']));
create policy "review own completed order" on provider_reviews for insert to authenticated with check (customer_id = auth.uid() and exists (select 1 from service_orders o where o.id = order_id and o.customer_id = auth.uid() and o.provider_id = provider_id and o.status = 'completed'));
create policy "settlements read" on provider_settlements for select using (has_staff(array['vendor_manager','finance_manager']) or exists (select 1 from providers p where p.id = provider_id and p.owner_id = auth.uid()));
create policy "settlements write" on provider_settlements for insert with check (has_staff(array['vendor_manager','finance_manager']));
create policy "provider complaints for managers" on tickets for select using (category = 'provider_complaint' and has_staff(array['vendor_manager']));   -- additive policy on the existing tickets table
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('provider-media','provider-media',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict do nothing;
create policy "upload provider media" on storage.objects for insert to authenticated with check (bucket_id = 'provider-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own provider media" on storage.objects for delete to authenticated using (bucket_id = 'provider-media' and (storage.foldername(name))[1] = auth.uid()::text);
