# Store and app-link files (Phase 4)

Templates for the two files that make `https://apronhanger.work/...` links open the app. **Not live and not usable yet:** each has one value only the stores can give.

| File to publish at | Template | Missing value | Where it comes from |
| --- | --- | --- | --- |
| `https://apronhanger.work/.well-known/assetlinks.json` | `assetlinks.template.json` | `sha256_cert_fingerprints` | Google Play Console -> Release -> App integrity -> **App signing key certificate** (SHA-256). Needs the Play account and the first upload. |
| `https://apronhanger.work/.well-known/apple-app-site-association` (no `.json`, served as `application/json`, no redirect) | `apple-app-site-association.template.json` | the Apple **Team ID** | Apple Developer account -> Membership. |

Rules
- Both must be served over https by the **candidate website host** (apronhanger.work), at those exact paths, without a redirect. Raj to tell me where that site is hosted (the repo has `wrangler.jsonc`, which suggests Cloudflare); once known, the files go in `candidates/public/.well-known/` in a website PR (the same way as `delete-account.html`).
- Until the real values are in, do not publish the templates: a wrong fingerprint only makes links open the browser, but a half-filled file is confusing.
- The paths listed match the app's link router (`src/lib/linking.ts`) and `app.config.ts` (Android `intentFilters`, iOS `associatedDomains`, production variant only).
- The preview/dev package ids (`.preview`, `.dev`) are NOT in these files on purpose: only the store app opens web links.
- The Android release key used by EAS is NOT the Play signing key if Play App Signing is on: always take the fingerprint from the Play Console.
- Test after publishing: `adb shell pm get-app-links work.apronhanger.candidate` (Android) and Apple's validator for the iPhone.

Other things the stores need that are not in the repo yet (Raj / client): privacy policy URL (`https://apronhanger.work/privacy-policy.html`), account deletion URL (`https://apronhanger.work/delete-account.html`, backend PR "delete-account-page"), App Store Connect app id (replace `IOS_STORE_URL` in `src/lib/site.ts`), support email (the pages use `support@apronhanger.work`).
