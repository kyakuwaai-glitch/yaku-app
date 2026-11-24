# Put YAKU online (about 30 minutes)

## 1. Supabase (free tier is fine to start)
1. supabase.com > New project. Note the **Project URL** and **anon public key** (Settings > API). Never use the service_role key in this app.
2. SQL Editor: run, in order, `schema.sql`, `phase2_company.sql`, `phase3_business.sql`.
3. Authentication > Users > **Add user** > email `navyraj725@gmail.com`, type the password yourself, tick **Auto Confirm User**.
4. SQL Editor: run `make_first_admin.sql`. It should show role = admin.
5. Authentication > URL Configuration: add your live site address as the Site URL (after step 2 below).
6. Authentication > Providers > Google: add your Google client ID and secret if you want Google sign-in.

## 2. Hosting (Vercel or Netlify, both have free plans)
1. Put this folder in a GitHub repository (`.env` is already ignored).
2. Vercel > Add New Project > import the repo. Framework: Vite.
3. Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.
4. Deploy. `vercel.json` and `public/_redirects` make deep links such as /staff-login work.
5. Add your domain (for example yaku.ug) in the host's Domains settings.

## 3. First check
- Open `/staff-login`, sign in as the admin, and confirm the console opens.
- Open `/login` with a normal customer account and confirm `/console` sends it away.
- In the console: Staff & audit > grant roles to your team by email (they must register first).
- Supabase > Database > Backups: turn on daily backups / point-in-time recovery before real orders.
