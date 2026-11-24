# YAKU: Google Play and App Store readiness
Status: code additions written, NOT built or tested. Requirements below were checked on 17 Nov 2026; confirm them in Play Console / App Store Connect before you submit.

## Current store rules that apply
- Google Play: new apps and updates must target Android 16 (API 36) since 31 Aug 2026. Play Billing Library 8+ only matters if you use Play Billing.
- Apple: uploads must be built with Xcode 26+ and the iOS 26 SDK (since 28 Apr 2026).
- Both: in-app account deletion; Google also wants a web deletion link. Apple 5.1.2(i): name the third-party AI provider and get explicit permission before sending personal data. Privacy labels / Data safety forms must match what the app really does. SDK privacy manifests (iOS) must be present.

## BLOCKERS: the app will likely be rejected until these are done
1. **Incomplete features (Apple 2.1, Google "broken functionality").** Cart and Wishlist are "next phase" placeholder pages, there is no product detail page or checkout, and some pages say "not available yet" (Track My Order, empty dashboards). Build and test real browsing > cart > checkout > payment > order tracking, or remove every unfinished screen from the app.
2. **Payments.** No payment gateway is connected. Physical goods and services may use mobile money / cards outside in-app purchase. If you ever sell digital items (for example AI credits), Apple and Google require their own billing.
3. **Developer accounts.** Apple Developer Program (organisation accounts need a D-U-N-S number) and Google Play Console. The legal name must match the business that owns the app. Check Google's current testing requirement for new developer accounts.
4. **Real-device testing** of every flow, plus screenshots from the real app (not mock-ups).
5. **Social sign-in.** Google sign-in is hidden inside the native app because Google blocks it in embedded web views. If you later add Google/Facebook sign-in on iOS you must also offer Sign in with Apple. Use a native social-login plugin and test it.

## Added in code (untested)
- Installable PWA: manifest, icons, offline app shell (`public/sw.js`, never caches Supabase or other origins).
- Capacitor wrapper config (`capacitor.config.ts`), native bridge (status bar, splash, Android back button, deep links), phone safe-area CSS, 44 px touch targets.
- Icons and splash sources in `resources/` (1024 px RGB icon with no transparency).
- Account deletion: `/account/delete` (public URL for the stores + in-app link), `delete-account` function, `phase7_account_deletion.sql`. Accounts with open orders, jobs or business records create a support ticket instead of deleting immediately.
- AI consent screen naming OpenAI before any chat, design or AI artwork review; the server refuses AI calls without it. Privacy text updated (if you edited Privacy in the admin editor, add the AI paragraph there too).
- Terms and Privacy agreement on registration; "Report this listing" on provider profiles (reports go to Support tickets).

## Build steps
1. `npm install` then `npm run build` (fix any TypeScript errors first).
2. `npx cap add android` and (on a Mac) `npx cap add ios`; `npm run assets`; `npm run cap:sync`.
3. Android: in `android/variables.gradle` make sure `targetSdkVersion` is 36 or higher; sign with Play App Signing; upload the `.aab`.
4. iOS: open in Xcode 26+, set Team and bundle ID, confirm `PrivacyInfo.xcprivacy` is present and accurate, archive, upload via TestFlight.
5. After `npm install`, replace `"latest"` in package.json with the exact versions it installed.
6. Deep links (optional): publish `/.well-known/assetlinks.json` (needs your Android signing SHA-256) and `apple-app-site-association` (needs your Apple Team ID). Not created because those values are yours.

## URLs to give the stores
Privacy policy `https://YOURDOMAIN/info/privacy` · Support `https://YOURDOMAIN/info/contact` · Account deletion `https://YOURDOMAIN/account/delete` · Terms `https://YOURDOMAIN/info/terms`
