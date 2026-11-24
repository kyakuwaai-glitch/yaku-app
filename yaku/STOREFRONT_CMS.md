# Storefront editing from the Business Console (written, NOT yet run or tested)
1. Run `supabase/phase8_storefront_cms.sql`. It creates the `store-media` image bucket (product photos now load from it; if you already uploaded photos to `public-assets`, re-upload them) and adds store-manager permissions.
2. Grant yourself or your team the **store_manager** role (Console > Staff & audit). Super admins can do everything.
3. Console > **Storefront** has: Banners & ads (hero, promo, top strip, ad slots with dates, order and click counts), Departments, Homepage (rename/hide/reorder sections), Products (title, description, photo, price, promo price, publish), Pages (About, policies), Footer & contact, Flash sales.
## Notes
- Built-in banners and sections show until you post your own; deleting yours brings them back.
- Ads are always labelled "Ad". Clicks are counted; impressions are not.
- Footer link lists and the main menu structure are still fixed in code (departments are editable).
- Product stock stays in Console > Inventory.
- Tests to run: [ ] post a hero banner and see it live  [ ] schedule one in the future (must stay hidden)  [ ] ad link click increments the counter  [ ] `javascript:` links are refused  [ ] hide and reorder homepage sections  [ ] rename a department  [ ] a non-staff user cannot write any of these tables.
