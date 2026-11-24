-- Run after phase3_business.sql AND after you create this user in Supabase > Authentication > Users.
update profiles set role = 'admin' where lower(email) = 'navyraj725@gmail.com';
select id, email, role from profiles where lower(email) = 'navyraj725@gmail.com';  -- should show role = admin
