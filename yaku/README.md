# YAKU – Phase 1
1. `cp .env.example .env` and add Supabase URL + anon key.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Supabase → Storage: create public bucket `public-assets`. Auth → Providers: enable Google; add redirect URLs.
4. Make your first admin manually: `update profiles set role='admin' where id='<your user id>';`
5. `npm install && npm run dev`

## Phase 3 – Business console
1. Run `supabase/phase3_business.sql` after the other two SQL files.
2. First super admin: `update profiles set role='admin' where id='<your user id>';` Then sign in and open **/console** to grant staff roles by email.
3. Backups: in Supabase > Database > Backups, use the daily backups (Pro plan) and enable Point-in-Time Recovery before taking real money. Test a restore.
4. Never put the service_role key in this app. Payment webhooks must run in a Supabase Edge Function that holds its own secrets.

## Staff sign-in
Staff and admins sign in at **/staff-login**. Create each staff account in Supabase > Authentication > Users (email + password), then run `update profiles set role='admin' where email='<their email>';` for the first super admin, and grant other roles in the console. Passwords live only in Supabase (hashed). Never hard-code a password in the app: anyone can read front-end code.
