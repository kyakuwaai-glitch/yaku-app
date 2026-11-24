-- Phase 7: account deletion (App Store 5.1.1(v), Google Play). Run after phase5/phase6.
-- Records that must be kept for accounting stay, with personal details stripped. Foreign keys no longer block deletion.
alter table service_orders alter column customer_id drop not null;
alter table service_orders drop constraint if exists service_orders_customer_id_fkey, add constraint service_orders_customer_id_fkey foreign key (customer_id) references profiles(id) on delete set null;
alter table provider_reviews alter column customer_id drop not null;
alter table provider_reviews drop constraint if exists provider_reviews_customer_id_fkey, add constraint provider_reviews_customer_id_fkey foreign key (customer_id) references profiles(id) on delete set null;
alter table vendors drop constraint if exists vendors_owner_id_fkey, add constraint vendors_owner_id_fkey foreign key (owner_id) references profiles(id) on delete set null;
alter table designers drop constraint if exists designers_owner_id_fkey, add constraint designers_owner_id_fkey foreign key (owner_id) references profiles(id) on delete set null;
create function account_deletion_blockers(p_uid uuid) returns text[] language sql security definer stable set search_path=public as $$
  select array_remove(array[
    case when exists (select 1 from staff_roles where user_id = p_uid) or exists (select 1 from profiles where id = p_uid and role = 'admin') then 'Staff accounts must be removed by a super admin first.' end,
    case when exists (select 1 from service_orders where customer_id = p_uid and status in ('new','quoted','accepted','in_progress')) then 'You have open service requests. Complete or cancel them first.' end,
    case when exists (select 1 from orders where customer_id = p_uid and payment_status in ('paid','partial') and status not in ('delivered','completed','cancelled','refunded')) then 'You have paid orders that are not finished yet.' end,
    case when exists (select 1 from printing_requests where customer_id = p_uid and quote_status = 'approved' and production_status <> 'delivered') then 'You have a printing job in progress.' end,
    case when exists (select 1 from providers p where p.owner_id = p_uid and exists (select 1 from service_orders o where o.provider_id = p.id)) then 'Your provider profile has job records. YAKU support must close it.' end,
    case when exists (select 1 from vendors v where v.owner_id = p_uid and exists (select 1 from order_items i where i.vendor_id = v.id)) then 'Your vendor store has sales records. YAKU support must close it.' end,
    case when exists (select 1 from designers d where d.owner_id = p_uid and exists (select 1 from order_items i where i.designer_id = d.id)) then 'Your designer profile has sales records. YAKU support must close it.' end
  ], null) $$;
create function anonymize_user(p_uid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  update orders set customer_name = 'Deleted user', customer_email = null, customer_phone = null, delivery_address = null where customer_id = p_uid;
  update service_orders set customer_name = 'Deleted user', contact_phone = null, details = '[removed]' where customer_id = p_uid;
  update printing_requests set name = null, email = null, phone = null, specs = null, artwork_id = null, artwork_version_id = null where customer_id = p_uid;
  update tickets set name = null, email = null, phone = null where user_id = p_uid;
  update submissions set data = '{}'::jsonb, files = '{}' where user_id = p_uid;
  update provider_reviews set comment = null where customer_id = p_uid;
  delete from products where vendor_id in (select id from vendors where owner_id = p_uid);
  delete from vendors where owner_id = p_uid; delete from designers where owner_id = p_uid;
end $$;
revoke execute on function account_deletion_blockers(uuid), anonymize_user(uuid) from public, anon, authenticated;
