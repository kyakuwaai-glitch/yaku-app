# Service Providers: setup and test checklist (written, NOT yet run or tested)
1. Run `supabase/phase5_providers.sql` after phase4 (additive; no existing table is altered).
2. Redeploy the AI function so it can search real providers: `supabase functions deploy ai-chat`.
3. Admin > Service providers (or Business Console > Service providers): set the default commission %.
## Tests to tick on a staging project
- [ ] Existing homepage, store, studio, customer / vendor / admin logins behave exactly as before.
- [ ] A new and an existing user can create a provider profile; it stays pending and is NOT public.
- [ ] A provider cannot set their own status, verified flag or commission (try via the API).
- [ ] Admin approves the provider; profile and approved-category services appear in /providers.
- [ ] A custom service type stays hidden until the admin approves it.
- [ ] Customer requests a quote; provider quotes; customer accepts; provider starts and completes.
- [ ] Commission is recorded only on completion; earnings count only after the admin verifies payment.
- [ ] Settlement above the balance is rejected; refunds reduce earnings; none of this touches existing finance screens.
- [ ] Customer A cannot see customer B's requests; provider A cannot see provider B's.
- [ ] YAKU AI lists only real approved providers and says so when there are none.
