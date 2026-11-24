# YAKU AI: setup and test checklist
Status: written, NOT yet run or tested. Do not call any item complete until you have ticked it below on a staging project.

## Setup
1. Run `supabase/phase4_ai.sql` after the earlier SQL files.
2. Install the Supabase CLI, then in this folder: `supabase link --project-ref <ref>`.
3. Set server secrets (never put these in the website or `.env`):
   `supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=gpt-4o-mini OPENAI_IMAGE_MODEL=gpt-image-1 AI_DAILY_LIMIT_USER=40 AI_DAILY_LIMIT_ANON=10 AI_DAILY_IMAGE_LIMIT=5`
4. Deploy: `supabase functions deploy ai-chat artwork-inspect artwork-correct design-generate`
5. Console > Pricing: add real price rules. With none, every quote is a custom quotation.
If OPENAI_API_KEY is missing the app says so; it never pretends AI worked.

## Tests to run (tick when passed)
- [ ] Visitor (signed out): chat answers product and price questions, cannot see any order.
- [ ] Customer: track_order returns only their own order; another customer's order number returns nothing.
- [ ] Vendor chat works for an approved vendor and is refused for a normal customer; staff chat refused for non-staff.
- [ ] Daily limits stop the chat after AI_DAILY_LIMIT_* requests and design after AI_DAILY_IMAGE_LIMIT images.
- [ ] Price rules: add rules, check instant quote maths by hand; remove a rule and confirm "custom quotation".
- [ ] Upload PNG, JPG, PDF; upload a renamed .exe/.txt as .png and confirm it is rejected; 16 MB file rejected.
- [ ] Inspection: low-DPI, transparent PNG, no-bleed and wrong-shape files each raise the right issue.
- [ ] Correction: original unchanged; corrected copy appears; compare and download work; PDF correction refused.
- [ ] Production blocked until quote approved, payment verified AND artwork approved.
- [ ] Design generation succeeds, and fails honestly with a wrong key or exhausted quota.
- [ ] Customer A cannot read customer B's artwork (try a signed URL and a direct table query).
- [ ] Mobile layout of chat, Print Studio and console on a real phone.

## File attachments in chat (phase 6)
- Run `supabase/phase6_ai_attachments.sql`, then redeploy: `supabase functions deploy ai-chat`.
- Signed-in users can attach up to 3 files (10 MB each): PDF, PNG/JPG/WebP, TXT/CSV/MD/JSON. Word/Excel files are refused with advice to save as PDF.
- Tests (not yet run): [ ] PDF is summarised correctly  [ ] image is described  [ ] CSV is read  [ ] signed-out user is told to sign in  [ ] a file renamed to .pdf that is not a PDF is not treated as one  [ ] user A cannot read user B's attachment path  [ ] a 11 MB file is rejected.
- Attachments stay in the private bucket until deleted; plan a cleanup (for example delete files older than 30 days).
