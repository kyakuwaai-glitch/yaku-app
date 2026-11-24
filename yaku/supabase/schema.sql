-- YAKU Phase 1 schema. Run in Supabase SQL editor.
create type user_role as enum ('customer','vendor','designer','admin');
create table profiles(
  id uuid primary key references auth.users on delete cascade,
  full_name text, phone text, role user_role not null default 'customer',
  created_at timestamptz default now());
create table role_requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  requested_role user_role not null check (requested_role in ('vendor','designer')),
  business_name text, status text not null default 'pending', created_at timestamptz default now());
create table vendors(id uuid primary key default gen_random_uuid(), owner_id uuid references profiles, name text not null, logo_path text, approved boolean default false);
create table designers(id uuid primary key default gen_random_uuid(), owner_id uuid references profiles, name text not null, specialty text, avatar_path text, approved boolean default false);
create table products(
  id uuid primary key default gen_random_uuid(), vendor_id uuid references vendors,
  department text not null, kind text not null default 'product' check (kind in ('product','service')),
  title text not null, description text, price_ugx integer, flash_price_ugx integer,
  image_path text, status text not null default 'draft', created_at timestamptz default now());
-- Role is always 'customer' at signup. Vendor/designer/admin roles are granted only by an admin.
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name');
  if new.raw_user_meta_data->>'requested_role' in ('vendor','designer') then
    insert into role_requests(user_id,requested_role) values(new.id,(new.raw_user_meta_data->>'requested_role')::user_role);
  end if; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function my_role() returns user_role language sql security definer stable set search_path=public as
$$ select role from profiles where id=auth.uid() $$;
alter table profiles enable row level security; alter table role_requests enable row level security;
alter table vendors enable row level security; alter table designers enable row level security; alter table products enable row level security;
create policy "own profile read" on profiles for select using (id=auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id=auth.uid()) with check (id=auth.uid() and role=my_role());
create policy "admin manage profiles" on profiles for all using (is_admin());
create policy "own requests" on role_requests for select using (user_id=auth.uid() or is_admin());
create policy "admin manage requests" on role_requests for all using (is_admin());
create policy "public approved vendors" on vendors for select using (approved or owner_id=auth.uid() or is_admin());
create policy "public approved designers" on designers for select using (approved or owner_id=auth.uid() or is_admin());
create policy "admin manage vendors" on vendors for all using (is_admin());
create policy "admin manage designers" on designers for all using (is_admin());
create policy "public published products" on products for select using (status='published' or is_admin() or vendor_id in (select id from vendors where owner_id=auth.uid()));
create policy "vendor manage own products" on products for all using (vendor_id in (select id from vendors where owner_id=auth.uid() and approved)) with check (vendor_id in (select id from vendors where owner_id=auth.uid() and approved));
create policy "admin manage products" on products for all using (is_admin());
