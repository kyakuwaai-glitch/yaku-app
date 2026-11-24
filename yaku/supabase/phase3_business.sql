-- Phase 3: Business management. Run after schema.sql and phase2_company.sql.
alter table profiles add column email text;
update profiles p set email = u.email from auth.users u where u.id = p.id;
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,full_name,email) values(new.id,new.raw_user_meta_data->>'full_name',new.email);
  if new.raw_user_meta_data->>'requested_role' in ('vendor','designer') then
    insert into role_requests(user_id,requested_role) values(new.id,(new.raw_user_meta_data->>'requested_role')::user_role);
  end if; return new; end $$;

-- ===== Staff roles (writes only through grant_role / revoke_role) =====
create type staff_role as enum ('super_admin','store_manager','order_manager','finance_manager','vendor_manager','support','printing_manager');
create table staff_roles(user_id uuid references profiles on delete cascade, role staff_role, granted_by uuid, created_at timestamptz default now(), primary key(user_id, role));
create function has_staff(roles text[]) returns boolean language sql security definer stable set search_path=public as
$$ select is_admin() or exists(select 1 from staff_roles where user_id=auth.uid() and (role='super_admin' or role::text = any(roles))) $$;
create function my_staff_roles() returns text[] language sql security definer stable set search_path=public as
$$ select case when is_admin() then array['super_admin'] else coalesce((select array_agg(role::text) from staff_roles where user_id=auth.uid()),'{}') end $$;

-- ===== Tables =====
create sequence order_seq; create sequence ticket_seq; create sequence print_seq;
alter table vendors add column status text not null default 'pending' check (status in ('pending','approved','suspended')), add column commission_pct numeric(5,2) check (commission_pct between 0 and 100);
update vendors set status = case when approved then 'approved' else 'pending' end;
alter table products add column stock integer not null default 0 check (stock >= 0), add column cost_ugx integer check (cost_ugx >= 0), add column low_stock_threshold integer not null default 5;
create table orders(
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default 'YK-'||to_char(now(),'YYMM')||'-'||lpad(nextval('order_seq')::text,5,'0'),
  idempotency_key text unique, customer_id uuid references profiles on delete set null,
  customer_name text not null, customer_email text, customer_phone text, delivery_address text, delivery_ref text,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','dispatched','delivered','failed')),
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','completed','cancelled','refunded')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','partial','paid','failed')),
  subtotal integer not null default 0, delivery_fee integer not null default 0, total integer not null default 0,
  status_note text, created_at timestamptz default now(), updated_at timestamptz default now());
create table order_items(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade,
  product_id uuid references products on delete set null, vendor_id uuid references vendors, designer_id uuid references designers,
  title text not null, qty integer not null check (qty > 0), unit_price integer not null check (unit_price >= 0), unit_cost integer,
  commission_rate numeric(5,2) not null default 0 check (commission_rate between 0 and 100));
create table order_events(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, status text, delivery_status text, note text, actor uuid default auth.uid(), created_at timestamptz default now());
create table payments(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders, provider text not null, provider_ref text not null,
  amount integer not null check (amount > 0), gateway_fee integer not null default 0 check (gateway_fee >= 0),
  status text not null check (status in ('succeeded','failed','refunded')), verified_by uuid default auth.uid(), created_at timestamptz default now(),
  unique (provider, provider_ref));  -- duplicate transactions are rejected here
create table stock_movements(id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, change integer not null check (change <> 0),
  reason text not null check (reason in ('restock','sale','adjustment','return','damage')), note text, actor uuid default auth.uid(), created_at timestamptz default now());
create table settlements(id uuid primary key default gen_random_uuid(), vendor_id uuid not null references vendors, amount integer not null check (amount > 0), reference text not null, note text,
  paid_at timestamptz default now(), recorded_by uuid default auth.uid(), unique (vendor_id, reference));
create table expenses(id uuid primary key default gen_random_uuid(), category text not null, description text, amount integer not null check (amount > 0), spent_on date not null default current_date, recorded_by uuid default auth.uid());
create table tickets(id uuid primary key default gen_random_uuid(), ticket_no text unique not null default 'TK-'||lpad(nextval('ticket_seq')::text,6,'0'),
  user_id uuid references profiles on delete set null, name text, email text, phone text, category text not null, subject text not null, description text, attachments text[] default '{}',
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')), assigned_to uuid references profiles on delete set null, resolution text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table ticket_events(id uuid primary key default gen_random_uuid(), ticket_id uuid not null references tickets on delete cascade, kind text not null, body text, actor uuid default auth.uid(), created_at timestamptz default now());
create table printing_requests(id uuid primary key default gen_random_uuid(), request_no text unique not null default 'PR-'||lpad(nextval('print_seq')::text,6,'0'),
  customer_id uuid references profiles on delete set null, name text, email text, phone text, product_type text, specs text, quantity integer, artwork_files text[] default '{}',
  quote_amount integer check (quote_amount >= 0), quote_status text not null default 'none' check (quote_status in ('none','quoted','approved','rejected')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','verified')), payment_ref text, payment_verified_by uuid, payment_verified_at timestamptz,
  production_status text not null default 'received' check (production_status in ('received','artwork_review','awaiting_approval','in_production','quality_check','ready','delivered')),
  qc_passed boolean, qc_notes text, delivery_status text not null default 'pending' check (delivery_status in ('pending','dispatched','delivered','failed')),
  created_at timestamptz default now(), updated_at timestamptz default now());
create table notifications(id uuid primary key default gen_random_uuid(), kind text not null, title text not null, body text, link text, roles text[] not null, created_at timestamptz default now());
create table notification_reads(user_id uuid default auth.uid() references profiles on delete cascade, notification_id uuid references notifications on delete cascade, primary key (user_id, notification_id));
create table audit_log(id bigint generated always as identity primary key, actor uuid, actor_email text, action text, entity text, entity_id text, details jsonb, created_at timestamptz default now());

-- ===== Internal helpers (not callable from the browser) =====
create function notify(p_kind text, p_title text, p_body text, p_link text, p_roles text[]) returns void language sql security definer set search_path=public as
$$ insert into notifications(kind,title,body,link,roles) values (p_kind,p_title,p_body,p_link,p_roles) $$;
revoke execute on function notify(text,text,text,text,text[]) from public, anon, authenticated;

-- ===== Triggers =====
create function apply_stock() returns trigger language plpgsql security definer set search_path=public as $$
begin update products set stock = stock + new.change where id = new.product_id; return new; end $$;  -- negative stock is blocked by the CHECK
create trigger stock_apply after insert on stock_movements for each row execute function apply_stock();
create function low_stock_alert() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.stock <= new.low_stock_threshold and old.stock > old.low_stock_threshold then
  perform notify('low_stock','Low stock: '||new.title,new.stock||' left (alert level '||new.low_stock_threshold||')','/console',array['store_manager']); end if; return new; end $$;
create trigger products_low_stock after update of stock on products for each row execute function low_stock_alert();

create function order_before_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status or new.delivery_status is distinct from old.delivery_status or new.status_note is not null then
    insert into order_events(order_id,status,delivery_status,note) values (new.id,new.status,new.delivery_status,new.status_note); end if;
  if new.delivery_status is distinct from old.delivery_status then
    perform notify('delivery','Delivery update: '||new.order_no,'Now '||new.delivery_status,'/console',array['order_manager']); end if;
  new.status_note := null; new.updated_at := now(); return new; end $$;
create trigger orders_upd before update on orders for each row execute function order_before_update();
create function order_after_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into order_events(order_id,status,delivery_status,note) values (new.id,new.status,new.delivery_status,'Order placed');
  perform notify('new_order','New order '||new.order_no,new.customer_name||' · UGX '||new.total,'/console',array['order_manager']); return new; end $$;
create trigger orders_ins after insert on orders for each row execute function order_after_insert();

create function sync_order_payment() returns trigger language plpgsql security definer set search_path=public as $$
declare paid numeric; t numeric; o text;
begin
  select coalesce(sum(amount) filter (where status='succeeded'),0) into paid from payments where order_id = new.order_id;
  select total, order_no into t, o from orders where id = new.order_id;
  update orders set payment_status = case when paid >= t and t > 0 then 'paid' when paid > 0 then 'partial' when new.status='failed' then 'failed' else payment_status end,
    status = case when paid >= t and t > 0 and status='pending' then 'confirmed' else status end where id = new.order_id;
  if tg_op='INSERT' or old.status is distinct from new.status then
    if new.status='succeeded' then perform notify('payment_ok','Payment received: '||o,'UGX '||new.amount||' via '||new.provider,'/console',array['order_manager','finance_manager']);
    elsif new.status='failed' then perform notify('payment_failed','Payment failed: '||o,new.provider||' ref '||new.provider_ref,'/console',array['order_manager','finance_manager']); end if; end if;
  return null; end $$;
create trigger payments_sync after insert or update on payments for each row execute function sync_order_payment();

create function check_settlement() returns trigger language plpgsql security definer set search_path=public as $$
declare b numeric; begin select balance into b from vendor_report(new.vendor_id);
  if new.amount > coalesce(b,0) then raise exception 'Settlement exceeds the vendor balance'; end if; return new; end $$;
create function printing_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.production_status in ('in_production','quality_check','ready','delivered') and (new.quote_status <> 'approved' or new.payment_status <> 'verified') then
    raise exception 'Production needs an approved quote and verified payment'; end if;
  if new.production_status in ('ready','delivered') and not coalesce(new.qc_passed,false) then raise exception 'Quality check must pass first'; end if;
  if new.payment_status='verified' and old.payment_status <> 'verified' then new.payment_verified_by := auth.uid(); new.payment_verified_at := now(); end if;
  new.updated_at := now(); return new; end $$;
create trigger printing_guard_trg before update on printing_requests for each row execute function printing_guard();
create function printing_new() returns trigger language plpgsql security definer set search_path=public as $$
begin perform notify('printing','New printing request '||new.request_no,coalesce(new.product_type,''),'/console',array['printing_manager']); return null; end $$;
create trigger printing_ins after insert on printing_requests for each row execute function printing_new();
create function ticket_before_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then insert into ticket_events(ticket_id,kind,body) values (new.id,'status','Status: '||new.status||coalesce(' – '||new.resolution,'')); end if;
  if new.assigned_to is distinct from old.assigned_to then insert into ticket_events(ticket_id,kind,body) values (new.id,'assigned','Assigned to '||coalesce((select full_name from profiles where id=new.assigned_to),'nobody')); end if;
  new.updated_at := now(); return new; end $$;
create trigger tickets_upd before update on tickets for each row execute function ticket_before_update();
create function ticket_new() returns trigger language plpgsql security definer set search_path=public as $$
begin perform notify('ticket','New ticket '||new.ticket_no,new.subject,'/console',array['support']); return null; end $$;
create trigger tickets_ins after insert on tickets for each row execute function ticket_new();
create function request_new() returns trigger language plpgsql security definer set search_path=public as $$
begin perform notify('application','New '||new.requested_role||' application','Waiting for review','/console',array['vendor_manager']); return null; end $$;
create trigger role_requests_ins after insert on role_requests for each row execute function request_new();

-- Existing forms feed the new systems: complaints become tickets, printing forms become printing requests.
alter table submissions drop constraint submissions_type_check;
alter table submissions add constraint submissions_type_check check (type in ('contact','career','ipr','dispute','return','report','partner','printing'));
create function submission_router() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.type in ('contact','dispute','return','report') then
    insert into tickets(user_id,name,email,phone,category,subject,description,attachments) values (new.user_id,new.data->>'name',new.data->>'email',new.data->>'phone',
      coalesce(new.data->>'category',new.type), initcap(new.type)||coalesce(' – order '||nullif(new.data->>'order_no',''),''),
      coalesce(new.data->>'message',new.data->>'description',new.data->>'reason'), new.files);
  elsif new.type='printing' then
    insert into printing_requests(customer_id,name,email,phone,product_type,specs,quantity,artwork_files) values (new.user_id,new.data->>'name',new.data->>'email',new.data->>'phone',
      new.data->>'product_type',new.data->>'specs', case when (new.data->>'quantity') ~ '^[0-9]+$' then (new.data->>'quantity')::int end, new.files);
  end if; return null; end $$;
create trigger submissions_route after insert on submissions for each row execute function submission_router();

-- ===== Audit log =====
create function audit_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin insert into audit_log(actor,actor_email,action,entity,entity_id,details)
  values (auth.uid(),(select email from profiles where id=auth.uid()),tg_op,tg_table_name,coalesce(r->>'id',r->>'slug',r->>'key',r->>'user_id'),
  case when tg_op='UPDATE' then jsonb_build_object('old',to_jsonb(old),'new',r) else r end); return null; end $$;
do $$ declare t text; begin
  foreach t in array array['staff_roles','vendors','payments','settlements','expenses','orders','printing_requests','tickets','role_requests','site_settings','pages','campaigns'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_trg()', t); end loop; end $$;
create trigger audit_products after insert or update of price_ugx, cost_ugx, status, flash_price_ugx or delete on products for each row execute function audit_trg();
create trigger settlements_check before insert on settlements for each row execute function check_settlement();

-- ===== Reports (computed in the database from real records) =====
create function fin_calc(p_from timestamptz, p_to timestamptz) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare d numeric; c numeric; vs numeric; ds numeric; vc numeric; dc numeric; pr numeric; gf numeric; rf numeric; st numeric; ex numeric;
begin
  select coalesce(sum(i.qty*i.unit_price) filter (where i.vendor_id is null and i.designer_id is null),0), coalesce(sum(i.qty*i.unit_cost) filter (where i.vendor_id is null and i.designer_id is null),0),
    coalesce(sum(i.qty*i.unit_price) filter (where i.vendor_id is not null),0), coalesce(sum(i.qty*i.unit_price) filter (where i.designer_id is not null),0),
    coalesce(sum(i.qty*i.unit_price*i.commission_rate/100) filter (where i.vendor_id is not null),0), coalesce(sum(i.qty*i.unit_price*i.commission_rate/100) filter (where i.designer_id is not null),0)
  into d,c,vs,ds,vc,dc from order_items i join orders o on o.id=i.order_id where o.payment_status='paid' and o.created_at>=p_from and o.created_at<p_to;
  select coalesce(sum(quote_amount),0) into pr from printing_requests where payment_status='verified' and created_at>=p_from and created_at<p_to;
  select coalesce(sum(gateway_fee) filter (where status='succeeded'),0), coalesce(sum(amount) filter (where status='refunded'),0) into gf, rf from payments where created_at>=p_from and created_at<p_to;
  select coalesce(sum(amount),0) into st from settlements where paid_at>=p_from and paid_at<p_to;
  select coalesce(sum(amount),0) into ex from expenses where spent_on>=p_from::date and spent_on<p_to::date;
  return jsonb_build_object('direct_sales',d,'cogs',c,'vendor_sales',vs,'designer_sales',ds,'vendor_commission',vc,'designer_commission',dc,'printing_revenue',pr,
    'gateway_fees',gf,'refunds',rf,'settlements',st,'expenses',ex,'yaku_revenue',d+pr+vc+dc,'costs',c+gf+rf+ex,'profit',d+pr+vc+dc-c-gf-rf-ex);
end $$;
revoke execute on function fin_calc(timestamptz,timestamptz) from public, anon, authenticated;
create function finance_summary(p_from timestamptz, p_to timestamptz) returns jsonb language plpgsql security definer stable set search_path=public as $$
begin if not has_staff(array['finance_manager']) then raise exception 'Not allowed'; end if; return fin_calc(p_from,p_to); end $$;
create function dashboard_summary(p_from timestamptz, p_to timestamptz) returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
  if not has_staff(array['store_manager','finance_manager']) then raise exception 'Not allowed'; end if;
  return fin_calc(p_from,p_to) || jsonb_build_object(
    'total_sales',(select coalesce(sum(total),0) from orders where payment_status='paid' and created_at>=p_from and created_at<p_to),
    'total_orders',(select count(*) from orders where created_at>=p_from and created_at<p_to),
    'customers',(select count(*) from profiles where role='customer'),
    'vendors',(select count(*) from vendors where status='approved'),
    'designers',(select count(*) from designers where approved),
    'pending_payments',(select count(*) from orders where payment_status in ('unpaid','pending','partial') and status not in ('cancelled','refunded')),
    'pending_payments_amount',(select coalesce(sum(total),0) from orders where payment_status in ('unpaid','pending','partial') and status not in ('cancelled','refunded')),
    'completed_orders',(select count(*) from orders where status in ('delivered','completed') and created_at>=p_from and created_at<p_to),
    'pending_deliveries',(select count(*) from orders where payment_status='paid' and delivery_status in ('pending','dispatched') and status not in ('cancelled','refunded')),
    'printing_open',(select count(*) from printing_requests where production_status<>'delivered'));
end $$;
create function vendor_report(p_vendor uuid default null) returns table(vendor_id uuid, name text, gross numeric, commission numeric, earnings numeric, settled numeric, balance numeric)
language sql security definer stable set search_path=public as $$
  select v.id, v.name, g.gross, g.comm, g.gross-g.comm, s.settled, g.gross-g.comm-s.settled from vendors v
  cross join lateral (select coalesce(sum(i.qty*i.unit_price),0) gross, coalesce(sum(i.qty*i.unit_price*i.commission_rate/100),0) comm
    from order_items i join orders o on o.id=i.order_id where i.vendor_id=v.id and o.payment_status='paid') g
  cross join lateral (select coalesce(sum(amount),0) settled from settlements where vendor_id=v.id) s
  where (p_vendor is null or v.id=p_vendor) and (has_staff(array['vendor_manager','finance_manager']) or v.owner_id=auth.uid()) $$;

-- ===== Staff / vendor workflow functions =====
create function list_role_requests() returns table(id uuid, user_id uuid, requested_role user_role, business_name text, status text, created_at timestamptz, full_name text, email text)
language sql security definer stable set search_path=public as $$
  select r.id,r.user_id,r.requested_role,r.business_name,r.status,r.created_at,p.full_name,p.email from role_requests r join profiles p on p.id=r.user_id
  where has_staff(array['vendor_manager']) order by r.created_at desc $$;
create function approve_request(p_id uuid, p_approve boolean) returns void language plpgsql security definer set search_path=public as $$
declare r role_requests; n text;
begin
  if not has_staff(array['vendor_manager']) then raise exception 'Not allowed'; end if;
  select * into r from role_requests where id=p_id and status='pending' for update;
  if not found then raise exception 'Request not found or already handled'; end if;
  if p_approve then
    select coalesce(r.business_name, full_name, 'New seller') into n from profiles where id=r.user_id;
    update profiles set role=r.requested_role where id=r.user_id and role='customer';
    if r.requested_role='vendor' then insert into vendors(owner_id,name,approved,status) values (r.user_id,n,true,'approved');
    else insert into designers(owner_id,name,approved) values (r.user_id,n,true); end if;
    update role_requests set status='approved' where id=p_id;
  else update role_requests set status='rejected' where id=p_id; end if;
end $$;
create function respond_quote(p_id uuid, p_approve boolean) returns void language sql security definer set search_path=public as $$
  update printing_requests set quote_status = case when p_approve then 'approved' else 'rejected' end where id=p_id and customer_id=auth.uid() and quote_status='quoted' $$;
create function staff_directory() returns table(user_id uuid, full_name text) language sql security definer stable set search_path=public as $$
  select p.id,p.full_name from profiles p where cardinality(my_staff_roles())>0 and (p.role='admin' or exists(select 1 from staff_roles s where s.user_id=p.id)) $$;
create function staff_overview() returns table(user_id uuid, full_name text, email text, roles text[]) language sql security definer stable set search_path=public as $$
  select p.id,p.full_name,p.email,array_agg(s.role::text) from staff_roles s join profiles p on p.id=s.user_id where has_staff(array['super_admin']) group by p.id $$;
create function grant_role(p_email text, p_role staff_role) returns void language plpgsql security definer set search_path=public as $$
declare u uuid;
begin
  if not has_staff(array['super_admin']) then raise exception 'Not allowed'; end if;
  select id into u from profiles where lower(email)=lower(trim(p_email));
  if u is null then raise exception 'No account with that email'; end if;
  insert into staff_roles(user_id,role,granted_by) values (u,p_role,auth.uid()) on conflict do nothing;
end $$;
create function revoke_role(p_user uuid, p_role staff_role) returns void language plpgsql security definer set search_path=public as $$
begin if not has_staff(array['super_admin']) then raise exception 'Not allowed'; end if; delete from staff_roles where user_id=p_user and role=p_role; end $$;

-- ===== Row Level Security =====
alter table staff_roles enable row level security; alter table orders enable row level security; alter table order_items enable row level security; alter table order_events enable row level security;
alter table payments enable row level security; alter table stock_movements enable row level security; alter table settlements enable row level security; alter table expenses enable row level security;
alter table tickets enable row level security; alter table ticket_events enable row level security; alter table printing_requests enable row level security;
alter table notifications enable row level security; alter table notification_reads enable row level security; alter table audit_log enable row level security;
create policy "own staff roles" on staff_roles for select using (user_id = auth.uid());
create policy "orders read" on orders for select using (customer_id = auth.uid() or has_staff(array['order_manager','finance_manager','store_manager']));
create policy "orders write" on orders for all using (has_staff(array['order_manager'])) with check (has_staff(array['order_manager']));
create policy "items read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  or vendor_id in (select id from vendors where owner_id = auth.uid())
  or designer_id in (select id from designers where owner_id = auth.uid())
  or has_staff(array['order_manager','finance_manager','store_manager']));
create policy "items write" on order_items for all using (has_staff(array['order_manager'])) with check (has_staff(array['order_manager']));
create policy "events read" on order_events for select using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()) or has_staff(array['order_manager','finance_manager']));
create policy "payments read" on payments for select using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()) or has_staff(array['order_manager','finance_manager']));
create policy "payments write" on payments for all using (has_staff(array['order_manager','finance_manager'])) with check (has_staff(array['order_manager','finance_manager']));
create policy "stock read" on stock_movements for select using (has_staff(array['store_manager']));
create policy "stock write" on stock_movements for insert with check (has_staff(array['store_manager']));
drop policy "vendor manage own products" on products;
create policy "vendor own products" on products for all using (vendor_id in (select id from vendors where owner_id = auth.uid() and status = 'approved'))
  with check (status in ('draft','pending') and vendor_id in (select id from vendors where owner_id = auth.uid() and status = 'approved'));  -- vendors cannot self-publish
create policy "store staff products" on products for all using (has_staff(array['store_manager'])) with check (has_staff(array['store_manager']));
create policy "vendor manager approves products" on products for update using (has_staff(array['vendor_manager'])) with check (has_staff(array['vendor_manager']));
create policy "vendor staff" on vendors for all using (has_staff(array['vendor_manager'])) with check (has_staff(array['vendor_manager']));
create policy "finance reads vendors" on vendors for select using (has_staff(array['finance_manager']));
create policy "settlements read" on settlements for select using (has_staff(array['vendor_manager','finance_manager']) or vendor_id in (select id from vendors where owner_id = auth.uid()));
create policy "settlements write" on settlements for insert with check (has_staff(array['vendor_manager','finance_manager']));
create policy "expenses" on expenses for all using (has_staff(array['finance_manager'])) with check (has_staff(array['finance_manager']));
create policy "tickets read" on tickets for select using (user_id = auth.uid() or has_staff(array['support']));
create policy "tickets create" on tickets for insert to authenticated with check (user_id = auth.uid());
create policy "tickets update" on tickets for update using (has_staff(array['support']));
create policy "ticket events read" on ticket_events for select using (has_staff(array['support']) or (ticket_events.kind = 'status' and exists (select 1 from tickets t where t.id = ticket_id and t.user_id = auth.uid())));
create policy "ticket events write" on ticket_events for insert with check (has_staff(array['support']));
create policy "printing read" on printing_requests for select using (customer_id = auth.uid() or has_staff(array['printing_manager','finance_manager']));
create policy "printing update" on printing_requests for update using (has_staff(array['printing_manager'])) with check (has_staff(array['printing_manager']));
create policy "notifications read" on notifications for select using (has_staff(roles));
create policy "reads own" on notification_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "audit read" on audit_log for select using (has_staff(array['super_admin']));
create policy "staff read submission files" on storage.objects for select using (bucket_id = 'submissions' and has_staff(array['printing_manager','support']));
