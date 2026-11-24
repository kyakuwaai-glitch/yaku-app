# YAKU Uganda: full package
Status: written but NOT yet built, run or tested. Expect to fix some errors on the first build.

## Contents
- `yaku/` the project (React + TypeScript + Supabase), with Git history. Open this folder in your editor.
- `previews/` static layout previews you can open in any browser (nothing is connected in them).

## Order to follow
1. Supabase project: run `yaku/supabase/` SQL files in order: schema.sql, phase2_company.sql, phase3_business.sql, phase4_ai.sql, phase5_providers.sql, phase6_ai_attachments.sql, phase7_account_deletion.sql, phase8_storefront_cms.sql, then make_first_admin.sql (after you create your admin user in Supabase > Authentication).
2. Copy `.env.example` to `.env` and add your Supabase URL and anon key. Never put the service_role or OpenAI key in the website.
3. `npm install` then `npm run dev`.
4. AI: follow `AI_SETUP.md` (OpenAI key as a Supabase secret, deploy the 5 functions in `supabase/functions`).
5. Going live: `DEPLOY.md`. Phone stores: `STORE_READINESS.md` and `STORE_LISTING.md`.

## Guides inside yaku/
DEPLOY.md, AI_SETUP.md, PROVIDERS_SETUP.md, STOREFRONT_CMS.md, STORE_READINESS.md, STORE_LISTING.md, README.md

## Known gaps (be aware before launch)
No cart, checkout, product detail pages or payment gateway yet; Cart and Wishlist are placeholders. Payment verification is manual. Store submission (Google Play / App Store) is blocked until those are built. Everything above is untested.
