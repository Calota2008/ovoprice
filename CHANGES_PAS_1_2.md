# OvoPrice – pașii 1 și 2

## Pas 1: punct unic de date
- `src/services/priceProvider.ts`: interfața `PriceProvider` + `demoProvider`. Ecranele NU mai importă `data/mockData.ts`.
- `src/services/usePriceData.ts`: hook cu stări loading/error.
- Pentru backend: se scrie un `liveProvider` și se schimbă ultima linie din `priceProvider.ts`.
- `App.tsx`: toate ecranele folosesc produsul selectat (înainte, mai multe ecrane afișau mereu Dyson).
- Un produs fără detalii în demo arată starea „indisponibil”, nu un produs greșit.

## Pas 2: marcaj demo + fără afirmații inventate
- `src/components/DemoBadge.tsx`: `DemoBadge`, `DemoBanner` (global), `DemoFootnote`. Dispar automat când provider-ul nu mai e demo.
- Ratinguri, recenzii, garanții de livrare, politici de retur, stoc și linkuri de produs inventate sunt scoase din datele demo. Linkurile duc acum la căutări reale în magazin.
- Valorile calculate (minim, medie, economie, grafic) vin din datele produsului, nu din text fix.
- Scoase: „Optimal buying moment”, „RECOMMENDED”, filtrul „Top Rated”, „live feed” fals.

## Altele
- `package.json`: `esbuild` ^0.28.0 (cu ^0.25 `npm install` eșua din cauza vite 8).

# Pas 3: cod de bare real
- `src/utils/ean.ts`: validare GTIN (EAN-8/UPC-A/EAN-13/GTIN-14, cifră de control GS1) și normalizare (UPC-A => EAN-13).
- `src/components/BarcodeScanner.tsx`: citire cu camera. `BarcodeDetector` când există, altfel ZXing (`@zxing/library`, încărcat doar la nevoie). Opțiunile de cameră sunt oprite la închidere.
- `VisualMatcherModal.tsx`, tab „Barcode”: scoase butonul „Simulate Barcode Scan” și EAN-ul fix. Acum: buton cameră, introducere manuală cu validare, căutare prin `priceProvider.getProductByEan`, stare „Produs negăsit” (nu mai apare Dyson), mesaje pentru cameră refuzată / lipsă / fără HTTPS.
- `App.tsx`: produsul găsit după EAN se deschide direct în detalii (`onBarcodeProduct`).
- `mockData.ts`: 3 EAN-uri demo aveau cifra de control greșită (Samsung, De'Longhi, Magcubic); corectate. Alerta Dyson avea EAN trunchiat; corectat.
- Notă: camera cere HTTPS sau localhost.

# Pas 4: căutare textuală reală
- `src/utils/search.ts`: potrivire pe toți termenii, fără diacritice (kopfhörer = kopfhorer), tolerantă la cratime („xm5”, „wh1000xm5” găsesc WH-1000XM5), după titlu/brand/model/categorie; EAN doar pentru 8-14 cifre.
- `priceProvider.searchProducts` folosește această potrivire (backend-ul va înlocui doar funcția).
- `SearchScreen.tsx` rescris: câmp gol la început (fără „Dyson V15” precompletat), căutare cu debounce, rezultate, sortare (preț mic / reducere mare), filtru „Transport gratuit”, stare „niciun rezultat”, căutări recente salvate local (șterge una / toate), căutări populare, scurtături spre scanare cod de bare / poză.
- Scoase filtrele „In stock” și „Fast delivery” (nu avem date reale pentru ele) și cifrele inventate („18 results”).
- `App.tsx`: un rezultat deschide direct produsul ales.

# Pas 5: analiza linkurilor fără simulări
- `src/utils/retailerLinks.ts`: parser LOCAL de linkuri (fără cereri de rețea). Acceptă MediaMarkt, OTTO, Amazon.de/.at, eBay.de; extrage ID-ul (ID articol / ASIN / nr. articol) și numele produsului din adresă. Respinge: linkuri goale/invalide, non-http(s), cu utilizator:parolă, domenii false (`evilmediamarkt.de`, `mediamarkt.de.evil.com`), linkuri scurtate (amzn.to, bit.ly…) și linkuri de social media, cu mesaj explicit.
- Bug reparat: ID-ul OTTO era uneori un cuvânt din numele produsului (ex. „absolute”); acum cere format de ID real.
- `priceProvider.matchProductFromLink` + `matchBySlug`: potrivește linkul cu un produs din catalog după nume (brand + ≥60% din cuvinte). Rezultatul e prezentat ca „posibil produs, verifică”, nu ca fapt.
- `VisualMatcherModal`: scoase animațiile cu `setTimeout`, butonul „TikTok Demo”, „Simulate Photo Match (Dyson)” și șirurile magice (tiktok/instagram dyson). Spinnerul apare doar cât durează potrivirea reală.
- `VisualMatchResultScreen`: vedere generică pentru 4 magazine; stare corectă „Prețul nu a fost citit din link”; scoasă vederea demo TikTok (acum stare goală).
- `HomeScreen`: toast-ul fals „Link detected on clipboard” înlocuit cu „Lipește și analizează”, care citește clipboardul doar la apăsare. Textele „TikTok, IG” scoase.
- `mockData`: șters `tiktokMatchedProduct` și tipurile asociate.
- `tests/e2e_pasii_3_5.py`: test Playwright pentru link, lipire, cod de bare și căutare (16 verificări trec).

## Pasul 6 — Alerte și produse salvate (local)
- Alertele și produsele salvate se păstrează în localStorage (chei `ovoprice_alerts_v1`, `ovoprice_saved_products_v1`); pornesc goale, fără date fictive.
- Alertele se evaluează local față de prețul curent: WATCHING / PRICE_DROPPED / TARGET_REACHED. Nu există notificări reale (necesită backend).
- Imaginile și prețurile se reîmprumută din provider după `productId` (URL-urile Vite se schimbă la build).
- Date stricate în localStorage sunt ignorate fără crash.
- Fix: ofertele produselor non-Dyson lipseau în `sanitizeProduct` (crash pe ecranul Breakdown).
- Teste: `tests/e2e_pasul_6_alerte_salvate.py`.

## Pasul 7 — Curățenie
- Bara demo „Screen Navigator” e ascunsă; apare doar cu `?devnav=1`.
- Profil: eliminat emailul și „Demo Active”; acum „Vizitator, fără cont”. Contorul de alerte necitite pornește de la 0.
- SetPriceAlert: eliminat comutatorul push fals și textele „simulate”; text onest despre alerta în aplicație.
- Eliminat `SpotPriceLogo`; pachet redenumit `ovoprice`; `index.html`/`metadata.json` actualizate (lang=ro).
- Imagini optimizate (4,8 MB → 0,6 MB în src/assets; logo 1,2 MB → ~0,2 MB).
- Adăugat `ErrorBoundary`.
- Teste: `tests/e2e_pasul_7_toate_produsele.py` (toate ecranele × 5 produse + bara ascunsă implicit).
- Rămas: limba interfeței (mix RO/EN/DE), backend (rate limiting `/api/analyze-image`, verificare model Gemini).

## Modul Reels (finalizare, doar frontend)
Probleme găsite la audit: nu există videoclipuri reale; „Compare Prices" deschidea ultimul produs selectat (nu cel din Reel); prețul redus, prețul original, „-30%" și „14 magazine" erau inventate și hardcodate; butoanele Share/More erau simulate; poziția în feed se pierdea la revenire.
- `types.ts`: `ReelItem` simplificat (`productId`, `videoUrl?`, `creatorLabel`); `StoreOffer.isAffiliate?` (doar linkuri confirmate).
- `mockData.ts`: `demoReels` fără prețuri/reduceri/magazine/creatori inventați; prețul și ofertele vin din produs, prin `priceProvider`.
- `ProductReelsScreen.tsx`: redat un singur video (doar reel-ul curent e montat), play/pauză la tap, mute doar când există video, stări loading/eroare video, navigare prin butoane, tastatură și swipe; filtre For You / Categories / Saved Products; Compare Prices (dezactivat fără oferte), View Details, Save/Saved; stări „Product not found", „No offers available yet", „No reels available yet"; mențiune de afiliere doar dacă o ofertă are `isAffiliate`.
- `App.tsx`: `handleOpenProduct(id, target)` deschide produsul exact; salvarea din Reels folosește același mecanism ca ecranul Saved; poziția din feed se păstrează; avertizare dacă salvarea locală eșuează.
- `ExternalRedirectModal.tsx`: buton de cumpărare doar pentru URL http(s) valid; mențiune de afiliere condiționată.
- `utils/analytics.ts` (evenimente locale, fără stocare/trimitere), `utils/url.ts`.
- `HomeScreen.tsx`: cardul Reels este buton; „REELCART" → „REELS".
- Teste: `tests/e2e_reels.py` (40 verificări), `tests/e2e_reels_video.py` (necesită clip temporar).
- Backend nemodificat (`server.ts` neatins).

## Reels: Add Reel (local, doar pe dispozitivul utilizatorului) + Compare și Buy
- Buton „+" în antetul Reels → formular `AddReelModal`: video (MP4/WebM, max 40 MB și 90 s) sau poză (JPG/PNG/WebP, redimensionată la max 1280 px), nume produs, descriere, categorie, specificații (max 8 rânduri), potrivire cu catalogul prin cod de bare (validare GS1 existentă), link de cumpărare https opțional și bifă „affiliate link".
- Stocare: metadate în localStorage (`ovoprice_user_reels_v1`), fișierele în IndexedDB (`utils/mediaStore.ts`). Nimic nu este trimis în exterior sau publicat; Reel-ul este marcat „Your Reel · this device only". Limită 10 reel-uri; ștergere cu confirmare în doi pași; intrările corupte, fără media sau cu linkuri nesigure sunt ignorate.
- Buy: produs potrivit cu catalogul → cea mai bună ofertă cu link valid, prin ecranul existent de predare către comerciant; produs nepotrivit → link-ul creatorului (doar https, `noopener`), fără link → buton dezactivat. Compare rămâne dezactivat fără produs din catalog („Not matched to a catalog product…"). Save/View Details apar doar pentru produse din catalog.
- Chip-uri cu specificații (ale creatorului sau Brand/Model/Color din catalog). Mențiunea de afiliere apare doar când linkul e marcat afiliat.
- Fișiere noi: `AddReelModal.tsx`, `services/useUserReels.ts`, `utils/userReels.ts`, `utils/mediaStore.ts`, `tests/e2e_add_reel.py` (45 verificări). `server.ts` neatins.
- Nu există publicare publică, conturi, moderare sau raportare (necesită backend).

## Reels: panou Compare peste feed
- „Compare Prices" deschide acum un panou (`ReelCompareSheet.tsx`) cu primele 3 oferte, sortate după prețul total, fără să părăsești feed-ul. Fiecare rând are „Buy" către ecranul existent de predare către comerciant (link https valid, altfel dezactivat). „See all N offers" duce la comparația completă a aceluiași produs.
- Diferențele „+X € vs lowest" sunt calculate din datele ofertelor; panoul arată DEMO și o notă că prețurile demo nu sunt oferte reale.
- Se închide cu X, Escape sau click pe fundal; la schimbarea Reel-ului se închide; săgețile nu schimbă Reel-ul cât timp e deschis.
- Teste: extinse în `tests/e2e_reels.py`. Backend neatins.

## Price alert from a Reel
- Bell button on the Reels right rail (only for Reels matched to a catalog product): opens the price-alert screen for that product; an existing alert pre-fills its target (`BellRing`, "Edit price alert").
- `SetPriceAlertScreen`: confirm timer is cleaned up on unmount, double clicks ignored.

## Saved collections (local)
- New `src/utils/collections.ts` (validation, name rules, toggle, prune) and `localStorage` key `ovoprice_collections_v1`. Corrupt data falls back to an empty list.
- Saved screen: tabs `All` + one per collection with counts, "New collection", rename, two-step delete (products stay saved), per-product "Collections" checklist, "In: …" label. Limits: 10 collections, 30 characters, unique names (case-insensitive).
- A product removed from Saved is removed from all collections automatically.
- Tests: `tests/e2e_collections.py` (16 checks) and `tests/unit_collections_similar.ts` (8 checks).

## Similar products (helper only)
- `src/utils/similar.ts` → `findSimilar(catalog, product)`: same category, other products, never invented. NOT shown in the UI yet: the 5-product demo catalog has one product per category, so the list would always be empty. Wire it in when the catalog grows.

## Language: UI unified in English
- All user-facing Romanian/German text translated (Home, Search, scanner modal, link results, offers, breakdown, price history, set-alert, alerts, saved, header, demo badges, errors, link-validation messages). `<html lang="en">`; dates use en-GB.
- Kept as-is on purpose: German retailer search terms (OTTO/IKEA/MediaMarkt queries) and demo catalog product data (e.g. German subtitle/colour of one product).
- Added `role="dialog"` + `aria-modal` to the scanner modal. Old e2e tests updated to the English strings.
- (Superseded by the next section: the app now has English, German and Romanian.)

## Account UI (no backend)
- `src/services/authProvider.ts`: single access point for accounts (`isConnected: false`, `signInWithGoogle`, `signInWithEmail`, `signOut`). It never pretends a user is signed in; swap it for Firebase Auth / Supabase / own API when the backend exists.
- `src/components/AuthSheet.tsx`: bottom sheet (centered on desktop) opened from the profile icon: "Continue with Google", passwordless email code, sign-in / create-account modes, "Continue as guest". Honest notice that accounts are not switched on; email format validated; Esc/backdrop/X close; `role="dialog"`.
- Header profile popover: "Sign in" and "Create an account" buttons.
- `src/components/AuthNudge.tsx`: dismissible one-line invitation on Saved and Alerts for guests (dismissal kept in localStorage).
- Nothing is stored or sent: no email is collected. No phone sign-in (SMS cost/abuse); add later only if needed.
- Test: `tests/e2e_auth_ui.py` (24 checks).

## Languages (EN / DE / RO), country and Account settings
- New `src/i18n/`: `index.ts` (`t()`, `tr()`, `setLanguage`, `useLanguage`, `dateLocale`), `de.ts`, `ro.ts`, `country.ts`. The English text is the key (`t('Price alerts')`); a missing translation falls back to English, never to an empty string. Constants defined outside components use `tr('…')` and are translated with `t(…)` when rendered.
- Language: first visit follows the browser (German / Romanian, otherwise English); the choice is stored in `localStorage` (`ovoprice_lang_v1`), sets `<html lang>`, the page title/description and date formats. Switching re-renders the whole app at once.
- Country: Germany and Austria only, in `COUNTRIES` in `src/i18n/country.ts` (add a line there to open a new country). Stored locally (`ovoprice_country_v1`, default Germany). It is a preference for now: no store or price filtering yet (both countries use EUR). With the backend it becomes a profile attribute.
- Create-account sheet: new "Your country" choice (create mode only). `authProvider` receives `{ mode, country }`.
- New screen **Account settings** (`SettingsScreen.tsx`, `'settings'` in `ActiveScreen`), opened from the profile menu: account card (sign in / create), language (English, Deutsch, Română), country.
- Demo data values shown to the user (delivery, stock, warranty, returns, badges, categories, chart dates) are translated through `t(value)`; product names/descriptions stay as data.
- Stored data no longer contains translated text (alert timestamps/details are computed when displayed: `alertTimestampText`, `alertDetailsText`; collection errors via `nameMessage`).
- Removed invented text in `BreakdownScreen` (hard-coded subtitle, "Direct Seller" tag) and unused imports/variables.
- `index.html` title/description are now English (the page title follows the selected language at runtime).
- Tests: `tests/unit_i18n.ts` (every key used in code has DE + RO, no unused/duplicate entries, matching `{placeholders}`), `tests/e2e_i18n_settings.py` (44 checks: switch, persistence, browser detection, invalid storage, country in sign-up, Settings page, mobile + desktop). Old e2e expectations updated.
- German and Romanian texts were written without native-speaker review: have them proofread before launch (German uses the informal "du").
- Not translated on purpose: the hidden dev toolbar (`?devnav=1`), brand/retailer names, German retailer search terms, product titles in the demo catalog.

## Voice search and keyboard on Search
- The microphone on Home now works (it was only an icon before). Tap it, say the product name; the Search screen opens with the spoken text and its results. Tap again to stop. Uses the browser's speech recognition (`src/utils/voiceSearch.ts`): Chrome, Edge, Safari. Where it is missing (e.g. Firefox) or blocked, a clear message is shown instead.
- Recognition language follows the app language: English (en-GB), German (de-DE, or de-AT when the country is Austria), Romanian (ro-RO). The first use asks the browser for microphone permission. Speech is processed by the browser/OS vendor's service, not by OvoPrice; nothing is stored.
- The Home search box still opens the separate Search screen. On phones and tablets (touch devices) the keyboard opens at once; on a computer the field is not focused automatically. After a spoken search the field is not focused either (the results are the point).
- A spoken query only seeds the Search screen it opens; opening Search later from the bottom bar starts empty.
- Tests: `tests/unit_voice.ts` (8 checks), `tests/e2e_voice_search.py` (26 checks, with a fake speech recogniser: 3 languages, Austria, denied/silent/unsupported, cancel, no stale text, keyboard on phone/tablet/computer). `e2e_pasii_3_5.py` updated (it clicked the first button named "Search", which is now the microphone).

## Signed-in state in the UI (local test account)
- `authProvider` now has `subscribe()` and a `useAuthUser()` hook (`src/services/useAuthUser.ts`), so every screen reacts when the user changes. The real provider is still "no backend": nobody can sign in by accident.
- Signed-in screens: header avatar with initials, profile menu with name, e-mail, "Account settings" and "Sign out"; Account settings card with name/e-mail and "Sign out"; guest-only invitations (nudges, sign-in buttons) disappear.
- To check these screens before the backend exists there is a LOCAL TEST ACCOUNT: open the app once with `?previewAccount=1` (development only, kept for the browser session, `?previewAccount=0` switches it off). Any valid e-mail or "Continue with Google" signs in as a test user, labelled **TEST ACCOUNT** everywhere, nothing is sent or stored on a server. Production builds do not contain this code (checked in the build output).
- Sign-up country still goes through `signInWithEmail(email, { mode, country })` and is saved locally.
- Test: `tests/e2e_account_state.py` (mobile + desktop, 17 checks each).

## Real accounts (Supabase, e-mail code)
- New dependency: `@supabase/supabase-js` (`package.json` + `package-lock.json`). Run `npm install` after copying.
- `src/services/supabaseAuthProvider.ts` + `supabaseConfig.ts`: sign-in/sign-up with a 6-digit code sent by e-mail (no password). Sign-up creates the user (country and language stored as metadata); "Sign in" never creates users. Session is kept and refreshed by Supabase. Config uses the public project URL and publishable key (safe in the browser; data is protected by row level security). `VITE_SUPABASE_URL=` (empty) switches real accounts off.
- Database (already applied to the Supabase project): `public.profiles` (country, language) with row level security (each user reads/writes only their own row) and a trigger that creates the row at sign-up.
- Auth sheet: after "Email me a … code" a second step asks for the code (numeric keyboard, one-time-code autofill, resend with 30 s cooldown, "use a different email"); clear messages for wrong/expired code, too many attempts, unknown account, Google not switched on.
- Country/language are loaded from the account after sign-in and saved to it when changed in Account settings.
- Honest wording: saved products, alerts and Reels are NOT synced yet; the sheet says so while accounts are connected (`syncsData: false`).
- Google sign-in is wired but off until `VITE_SUPABASE_GOOGLE=1` (needs Google enabled in Supabase).
- Tests: `tests/e2e_supabase_accounts.py` (Supabase answers mocked, no e-mail is sent; run against `VITE_SUPABASE_GOOGLE= npx vite --port 5198`). Other e2e suites were run with `VITE_SUPABASE_URL=` so they never contact Supabase.

## Google / Apple sign-in buttons
- "Continue with Google" is the main button (account picker, so signing in again is one tap); "Continue with Apple" is shown too and says honestly "coming soon" until `VITE_SUPABASE_APPLE=1` (needs a paid Apple Developer account). The e-mail code stays as the fallback.
- First Google/Apple sign-in of a brand-new account keeps the country/language chosen on the device (sent to the profile instead of being overwritten by defaults).
- Account settings explains what "Sign out" does (session removed from this device, account stays saved).

## Sign-in sheet hints
- Under the Google/Apple buttons: "Google and Apple only work with a Google or Apple account. Another email (Yahoo, GMX, Outlook…)? Use the email code below."
- On the code step: "Can't see the email? Check your Spam folder." (EN/DE/RO)

## Private preview (not indexed)
- `index.html`: `<meta name="robots" content="noindex, nofollow, noarchive">` and `public/robots.txt` (`Disallow: /`) keep search engines away until launch. At launch: remove the meta line and change robots.txt to `Allow: /`.
- This only hides the site from search engines; it does NOT block visitors. Real access control is Cloudflare Access (set up in the Cloudflare dashboard).

## Delete account
- Account settings → "Delete account" (signed-in users only) opens a confirmation sheet: explains it is permanent, that products/alerts/Reels saved on this device are not part of the account yet and stay on the device, and asks the user to type the confirmation word (DELETE / LÖSCHEN / ȘTERGE). Failure keeps the account and explains; success signs out and shows "Your account was deleted."
- Server side: Supabase Edge Function `delete-account` (source in `supabase/functions/delete-account/index.ts`, already deployed to the project). It checks the caller's session token with Supabase Auth and deletes ONLY that user; the profile row goes with it (cascade). The service key lives only in the function runtime; `server.ts` is untouched. Origins allowed: ovoprice.com, www, onrender, localhost.
- Tests: `tests/unit_delete_account_fn.mts` (runs the real function source with a fake client: no token / publishable key / fake token / wrong method are refused, only the caller is deleted), `tests/e2e_supabase_accounts.py` (dialog, wrong word, cancel, server failure, success).
- Not tested live: a real deletion against Supabase (done by the owner with a test account).

## Display name and Contact us
- Database (already applied): `profiles.display_name` (1-60 characters). Account settings → "Edit name": validated, saved on the account, shown in the header, popover and settings. The chosen name wins over the one from Google / the e-mail address, also on other devices (loaded after sign-in).
- "Contact us" (Account settings → Help) opens an e-mail to `VITE_CONTACT_EMAIL`. If the variable is empty or not a valid address the button is not shown; no address is ever invented. Set it in Render (Environment) once an inbox exists, e.g. support@ovoprice.com.
- Tests: `tests/e2e_supabase_accounts.py` (name: empty refused, failure explained, saved, shown, restored after sign-in), `tests/e2e_contact.py` (needs a dev server with and without VITE_CONTACT_EMAIL).

## Legal pages, honest country text, photo errors (made while the owner was away)

**Legal pages (draft skeleton, NOT legal advice).** New screen `LegalScreen` with Impressum, privacy notice
(Datenschutzerklärung) and terms of use, in EN/DE/RO (`src/data/legalContent.ts`; German is the authoritative
version). Links sit in a footer under every screen (`LegalFooter`), and the create-account sheet shows a note with
links to the terms and privacy notice (an agreement notice, not a blocking checkbox).
- Operator details come from `VITE_LEGAL_NAME`, `VITE_LEGAL_ADDRESS` (use " | " for line breaks), `VITE_LEGAL_EMAIL`
  (falls back to `VITE_CONTACT_EMAIL`) and optional `VITE_LEGAL_PHONE`. Nothing is invented: while name, address or
  e-mail is empty, the pages show a "Draft" warning and "[to be completed]" markers. The phone line is hidden when empty.
- The privacy text describes what the app really does: no analytics or tracking cookies; data in the browser; Render
  (Frankfurt); Supabase (eu-central-1, Frankfurt); sign-in e-mails through Resend (EU); Google sign-in; photo analysis
  via the Gemini API (not stored by us); voice search by the browser; delete account.
- To do before publishing (needs a specialist or a generator such as eRecht24 / IT-Recht Kanzlei): review all three
  texts; Impressum details of the operator (private person: name and address, plus a second quick contact way);
  affiliate marking ("Anzeige"/ad) next to real affiliate links once Awin offers are shown; consumer arbitration
  statement if required; update the privacy text whenever a service is added (analytics, ads, Apple sign-in, sync).

**Country text corrected.** Settings and the sign-up sheet claimed the country "sets the stores and prices you see".
Today it does not (offers are demo data); it only adjusts the voice-search language. The text now says so.

**Photo recognition errors.** A network failure showed the browser's English "Failed to fetch", and an HTML error
page from the host showed a JSON parse error. Both now show a clear, translated message.

**Tests.** New `tests/e2e_legal.py` (28 checks) and `tests/e2e_photo_errors.py` (23 checks); `e2e_voice_search.py`
now targets the "Main Navigation" landmark because the footer adds a second navigation landmark.
`server.ts` is unchanged.

## Shareable lists (link, no server)

A collection in Saved now has a **Share list** button. The list (its name and product ids, at most 50 products) is
encoded inside the link `…/?list=…`; nothing is stored on a server, so there is no account, database or personal
data involved, and nothing to maintain. Whoever opens the link sees the **Shared list** screen: the products with
their current prices (and the DEMO label while data is demo), a note that anyone with the link can see the list, and
**Save all to my products**. Products that no longer exist are reported, never invented. Invalid or tampered links
are ignored (Home opens), names are shown as plain text only. On phones the native share sheet is used; otherwise
the link is copied, or shown in a field if copying is blocked.
Files: `src/utils/shareList.ts`, `src/components/screens/SharedListScreen.tsx`, changes in `SavedScreen.tsx`, `App.tsx`.
Tests: `tests/unit_share_list.ts` (15 checks) and `tests/e2e_share_list.py` (29 checks).
Not included on purpose (needs real data or accounts): "who buys what" coordination, price-drop e-mails, points.

## Fonts self-hosted (privacy fix)

`index.html` loaded Inter and JetBrains Mono from Google Fonts, which sends every visitor's IP address to Google
(German courts have treated this as a GDPR violation without consent). The Google links are removed. Inter is now
served from our own server through the package `@fontsource-variable/inter` (imported in `src/main.tsx`). JetBrains
Mono was never applied (no Tailwind theme set it), so it is dropped. **New dependency, needed for legal reasons:**
`package.json` and `package-lock.json` changed and must be uploaded; Render installs it at build time.
Test: `tests/e2e_no_third_party.py` checks that browsing contacts only our own host and that Inter is used.
The privacy notice now says fonts and images come from our own server.

## Reeluri v1 (ecran mai clar, fără dublură cu Acasă)
- **Acasă** rămâne pentru căutare/identificare. Bannerul „Discover Reels” arată acum 3 miniaturi din Reeluri (doar imagini existente), în același buton.
- **Reeluri:** un singur buton principal „Compară N prețuri” (N = numărul real de oferte). Butonul „Cumpără” separat a fost scos pentru reelurile din catalog; cumpărarea rămâne în foaia de comparare („Buy at …”).
- Buton nou **Trimite** (Share): linkul poartă produsul în el (același format ca lista partajată), fără server.
- **Mod grilă**: buton lângă filtre; miniaturi cu categorie și titlu, apăsarea deschide reelul în feed.
- Butonul **+ (Add Reel)** este ascuns pentru utilizatori. Apare doar cu `VITE_ENABLE_ADD_REEL=true` (testare locală). Decizie: în prima versiune doar echipa OvoPrice adaugă reeluri, cu MP4 încărcat de noi.
- Teste: `tests/e2e_reels_v1.py` nou (14 verificări); `e2e_reels.py` și `e2e_add_reel.py` adaptate (Add Reel cere serverul cu flag-ul). `e2e_reels_video.py` cere fixture temporar, neschimbat ca procedură.

## Magazine potrivite tipului de produs + Acasă nou
- **„Unde să cauți” (Where to look)** pe pagina produsului: magazine din țara aleasă (DE/AT) care vând de obicei acel *tip* de produs. Un uscător de păr arată magazine de electronice, electrocasnice și drogherii, nu magazine de mobilă, bricolaj sau supermarketuri. Sunt linkuri de căutare, nu prețuri, și textul spune asta.
  - `src/data/storeDirectory.ts`: directorul de magazine (doar magazine cunoscute, cu grupa lor). `src/utils/storesForProduct.ts`: regulile pe categorie/titlu. `src/components/StoresForProduct.tsx`: afișarea.
  - Pagina de căutare proprie a magazinului se folosește doar unde adresa e cunoscută (Amazon, MediaMarkt, Saturn, OTTO). Pentru restul, linkul e o căutare web limitată la site-ul magazinului, marcată „via web search”. Nu se inventează linkuri de produs.
  - Austria folosește amazon.de (nu există amazon.at). Tip de produs nerecunoscut: doar magazinele generale (Amazon, OTTO), cu mențiune.
  - Textul din Setări/Cont despre țară a fost actualizat (țara decide acum sugestiile de magazine).
- **Acasă:** „Popular searches” a fost înlocuit cu două rânduri laterale, „Price drops” și „New products” (demo, marcate „Example”). Provider-ul are acum `getPriceDrops()` și `getNewProducts()`; un provider live fără date întoarce listă goală și secțiunea dispare.
- Corectat un produs greșit din demo: cardul „Samsung Galaxy S24 Ultra” deschidea pagina unui televizor. Acum arată starea „Product Details Unavailable”.
- Teste noi: `tests/unit_stores_for_product.ts` (17), `tests/e2e_stores_for_product.py` (14), `tests/e2e_home_rails.py` (12); `e2e_pasul_6_alerte_salvate.py` actualizat.

## Ecranul „Vezi toate” (Price drops / New products)

- În rândurile „Price drops” și „New products” de pe Acasă a apărut linkul **Vezi toate** (zonă de atingere de minimum 44 px).
- Ecran nou `SeeAllScreen`: listă verticală, marcată „Example”/DEMO. Fiecare produs are **Compară prețurile** (merge direct la oferte) și **Detalii** (pagina produsului), butoane de 44 px.
- Sortare: Price drops = Cel mai mare rabat / Cel mai mic preț / Categorie; New products = Cele mai multe magazine / Categorie. Rabatul e folosit doar pentru ordonare, nu e afișat ca număr nou.
- Produsele fără detalii în catalogul demo au butoanele dezactivate și o notă, nu se deschide un produs greșit.
- Fișiere: `src/components/screens/SeeAllScreen.tsx` (nou), `HomeScreen.tsx`, `App.tsx`, `src/types.ts`, `src/i18n/de.ts`, `src/i18n/ro.ts`; teste: `tests/e2e_see_all.py` (nou, 20 verificări), `tests/e2e_home_rails.py`, `tests/unit_i18n.ts`.
- `server.ts` neatins. Nicio dependență nouă.

## Limite, microfon cu 3 limbi, clip demo în Reels

**Limite (fără plată)**
- `src/utils/limits.ts` (nou) = singurul loc cu numerele: 10 produse salvate, 3 alerte, colecții doar cu cont. Vizitatorii și conturile gratuite au aceleași limite de salvări/alerte; contul deblochează colecțiile. Un plan plătit se adaugă ulterior ca a treia intrare.
- `LimitSheet.tsx` (nou): când cineva depășește limita apare o fereastră care explică, nu o eroare. Nimic nu se șterge; ștergerea rămâne mereu posibilă. Textul nu promite sincronizare pe cont (nu există încă).
- Salvare produs, „Save without alert", „Salvează tot" din lista primită prin link (se salvează doar cât încape) și alerte noi sunt oprite la limită. Schimbarea țintei unei alerte existente rămâne permisă.
- Ecranul Saved: la limită apare „10 din 10 salvate" și o notă; „New collection" explică pentru vizitatori că e nevoie de cont. Colecțiile deja existente rămân vizibile.
- Teste: `tests/e2e_limits.py` (nou). `e2e_collections.py` și `e2e_share_list.py` se autentifică acum cu contul de test local.

**Microfon**
- În timpul ascultării apar 3 butoane: English, Deutsch, Română (44 px). Începe cu limba aplicației (germana + Austria = de-AT). Alegerea unei alte limbi repornește ascultarea în ea; se ține minte pe dispozitiv și se resetează când schimbi limba aplicației. Browserul înțelege o singură limbă o dată, deci limba nu se ghicește. Butoanele rămân și după „n-am auzit nimic".
- Teste: `tests/e2e_voice_languages.py` (nou); `unit_voice`/`e2e_voice_search` neschimbate ca logică.

**Clip demo în Reels**
- `public/reels/demo_reel.mp4` (8 s, 720×1280, H.264, fără sunet) și `demo_poster.jpg`. Intrare nouă `reel-demo-clip` la sfârșitul listei, fără produs legat: fără preț, fără Buy, „Compare" dezactivat cu explicația existentă. Titlul și descrierea sunt traduse.
- Teste: `tests/e2e_demo_reel.py` (nou); numărul de reeluri din `e2e_reels`, `e2e_reels_v1`, `e2e_add_reel` actualizat (5 → 6).
- `server.ts` neatins. Nicio dependență nouă.

## Sincronizare pe cont (salvări, alerte, colecții)

**Baza de date (Supabase, deja aplicată; copie în `supabase/migrations/20261028_create_user_lists.sql`)**
- Tabel nou `public.user_lists`: un rând per cont (`saved`, `alerts`, `collections` ca JSON), RLS activ, politici doar pentru `authenticated` cu `user_id = auth.uid()`, `anon` fără acces, plafoane de mărime. Se șterge odată cu contul (`on delete cascade`).
- Verificat cu SQL (tranzacție anulată, doi utilizatori fictivi): fiecare își citește/scrie doar rândul; celălalt nu vede, nu modifică, nu șterge; `anon` blocat; nu a rămas nimic în baza de date. Avertismentele de securitate rămase sunt vechi (`rls_auto_enable`, parole scurse) și nu țin de tabelul nou.

**Aplicație**
- `src/services/usePersistedLists.ts` (nou) înlocuiește salvarea locală din `App.tsx`. Vizitator: ca până acum, pe dispozitiv. Cont: datele contului se citesc de pe server și se trimit la fiecare schimbare (după 0,7 s). Nimic nu se trimite înainte ca datele contului să fi fost citite, deci un dispozitiv gol nu poate șterge contul.
- Datele de pe dispozitiv (de vizitator) nu se suprascriu niciodată: după autentificare apare o singură dată „Adaugi în cont ce ai salvat pe acest dispozitiv?" (`MergeSheet.tsx`). „Adaugă" le îmbină (fără dubluri, în limitele de 10/3, restul rămâne pe dispozitiv); „Nu acum" nu trimite nimic. La deconectare revine lista de pe dispozitiv, iar copia contului dispare de pe dispozitiv.
- Dacă serverul nu răspunde: mesaj clar pe ecranul Saved + „Încearcă din nou"; schimbările rămân pe dispozitiv și se îmbină cu contul la reîncercare. Ultima scriere câștigă între dispozitive.
- Reeluri adăugate de utilizator nu se sincronizează (rămân pe dispozitiv; funcția e oprită oricum).
- Texte actualizate (fereastra de creare cont, ștergerea contului). `src/utils/mergeLists.ts` (nou) = logica pură de îmbinare.
- Teste: `tests/unit_merge_lists.ts` (11), `tests/e2e_account_sync.py` (nou, 26, Supabase simulat), `e2e_supabase_accounts.py` adaptat.
- `server.ts` neatins. Nicio dependență nouă.

## Visitor limits: 1 saved product, 1 alert (Oct 28)
- `src/utils/limits.ts`: `GUEST_LIMITS` is now 1 saved product and 1 price alert (no collections). Accounts keep 10 saved / 3 alerts / collections (a Premium tier can raise these later).
- Reason: someone who only needs one or two products should not be able to use the app forever without an account.
- `LimitSheet` and the Saved banner now show the account offer to visitors ("Create an account" / "I already have an account"); signed-in users see only "Manage …".
- Nothing already saved is ever deleted; removing and re-saving still works; changing the target of an existing alert is allowed.
- Tests: `e2e_limits.py` rewritten (visitor 1/1, account 10/3); `e2e_share_list.py` receiver signs in with the local test account.

## Affiliate notice in the merchant hand-over window (Oct 28)
- `ExternalRedirectModal`: for affiliate offers (`isAffiliate === true`) a visible "Advertisement" (DE "Werbung", RO "Publicitate") label plus the commission sentence now sit ABOVE the "Proceed to …" button (before: small text below it). Non-affiliate offers show nothing.
- The demo catalog has no affiliate offers, so this is only visible once real (Awin) offers set `isAffiliate`. Terms already contain the "Affiliate links" section.

## Photo analysis: Google overload (503) handled (Oct 28)
- Real-world finding: the server reached Gemini fine (key OK) but Google answered 503 UNAVAILABLE ("high demand"); the app showed the raw JSON.
- `VisualMatcherModal`: on 503 / 429 / UNAVAILABLE the request is retried up to 2 more times (2 s, 4 s pause, status line "The analysis service is busy, trying again..."). If it still fails, a friendly translated message is shown instead of raw JSON. Other errors behave as before. `server.ts` untouched.
- `tests/e2e_photo_errors.py`: two new cases (always 503 = 3 tries + friendly message; 503 once then success).

## Two transparency notes (Oct 28)
- Photo tab: a short note under "Analyze Photo with Gemini" says the photo is sent through our server to Google's Gemini service and is not stored (the privacy text already said this; now it is visible before the user taps).
- Footer (`LegalFooter`): idealo-style price note: euros incl. VAT, plus shipping where it applies; prices, ranking and delivery times can change; the merchant's website price counts. EN/DE/RO.
- Tests: `e2e_photo_errors.py` +3 checks. Not legal advice: the texts still need a specialist review before launch.

## PC / wide-screen layout, step 1 (Oct 28)
- Breakpoint: `lg` (1024 px and up). Below that (phones, tablets) nothing changes.
- `App.tsx`: at `lg` the phone frame is gone and the page is up to `max-w-6xl`; Home uses the full width, every other screen stays a centered phone-width column for now (next steps).
- `Header.tsx`: top navigation (Home, Search, Saved, Alerts with unread badge, Reels) shown from `lg`; `BottomNav` is hidden from `lg`.
- `HomeScreen.tsx`: two columns (headline + search | Scan card), Reels strip with up to 6 thumbnails, "Price drops" / "New products" as a 4-column grid, larger headline.
- Tests: new `tests/e2e_wide_layout.py` (1280 / 390 / 768 px); `e2e_i18n_settings` and `e2e_reels_v1` adapted (hidden header nav and extra thumbnails).
- Next steps: Search, product page with offers table, comparison, Saved/Alerts grids.

## New vector logo mark (Oct 29)
- New `public/ovoprice_mark.svg` (tag + magnifier + bars, no wordmark inside): sharp at every size, transparent rounded corners, ~1 KB.
- `OvoPriceLogo.tsx`: uses the SVG (32 px on phones, 40 px on wide screens) with the "OvoPrice" text beside it (before: a 195 KB PNG that already contained the wordmark, unreadable below ~48 px).
- `index.html`: SVG favicon + 32 px PNG fallback + 180 px apple-touch icon (opaque, full-bleed, as iOS expects). New files: `public/ovoprice_favicon_32.png`, `public/ovoprice_apple_touch_180.png`.
- The old `public/ovoprice_logo.png` and `src/assets/images/ovoprice_logo.png` are no longer used (kept in the repo; can be deleted).
- Drawn as a close approximation of the old artwork, not a pixel copy. Check the "OvoPrice" name as a trademark before launch.

## Logo: your own icon, without the wordmark (Oct 29)
- The original icon (price tag + magnifier with bars) was taken from `public/ovoprice_logo.png`; the "OvoPrice" text was removed and the symbol enlarged on a clean background with the same blue colours.
- New files: `public/ovoprice_icon_256.png` (header), `public/ovoprice_icon_512.png` (spare, large), `public/ovoprice_favicon_32.png` (tab), `public/ovoprice_apple_touch_180.png` (phone home screen).
- `src/components/OvoPriceLogo.tsx` and `index.html` now use these PNGs. The name is written next to the icon in the header.
- `public/ovoprice_mark.svg` and the old `ovoprice_logo.png` are no longer used, but kept.

## Reels: no up/down arrows on phones and tablets (Oct 29)
- `src/components/screens/ProductReelsScreen.tsx`: the two arrow buttons are hidden on touch screens (`hidden pointer-fine:flex`); phones and tablets switch reels by swiping. On PC (mouse) the arrows stay, because a mouse cannot swipe; the keyboard arrows also keep working.
- `tests/e2e_reels.py`: navigation on the touch test uses the keyboard; new checks: arrows hidden on touch, visible and working on PC, a real finger swipe up/down changes the reel.
- All Reels buttons were clicked through on a phone-size screen (Back, For You / Categories / Saved Products, category chips, grid view, Save, Alert, Share, Compare prices, Buy at, See all offers, Close, View Details): all work.

## Datenschutz: account section matches the sync (Oct 29)
- `src/data/legalContent.ts` (EN/DE/RO), section "4. Account": the old sentence "saved products, alerts and Reels are not synced" was wrong since account sync. Now: when signed in, saved products, price alerts and collections are stored so they match on all devices; Reels added by the user stay on the device; without an account everything stays on the device. Deleting the account also removes the synced lists (the `user_lists` row is deleted with the account).

## Security before launch: server.ts (Oct 30, with the owner's OK to change server.ts)
- **Security headers** on every response: X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (camera/microphone only for this site), Cross-Origin-Opener-Policy. In production also Content-Security-Policy (scripts only from the site itself; network only to the site and Supabase; no framing) and HSTS. `X-Powered-By` removed. The dev server gets no CSP (Vite needs inline scripts).
- **Photo analysis protected** (each call costs Gemini money): max 8 per minute and 100 per day per visitor, plus max 500 per day for the whole site. Visitor = Cloudflare `CF-Connecting-IP`, otherwise the address given by Render's proxy (`trust proxy 1`). Over the limit: HTTP 429 `{code: "RATE_LIMIT"}` with `Retry-After`.
- **Upload checks**: only JPEG/PNG/WebP/HEIC/GIF, content must be base64, max 5 MB (same as the app). Body limit 8 MB only on the photo route, 100 KB everywhere else (was 10 MB everywhere). Too-large or broken bodies answer with JSON, not an HTML error page.
- Imports of express types are now `import type` (the server also starts with plain `node server.ts` on Node 22).
- App (`VisualMatcherModal.tsx`): on our own limit it does not retry and says "You have analyzed many photos in a short time…" (EN/DE/RO); a 413 shows the 5 MB message.
- New `tests/e2e_server_security.py` (17 checks; needs `npm run build` and `NODE_ENV=production PORT=5302 GEMINI_API_KEY=fake node server.ts`).
- Still recommended (owner, outside the code): a budget/quota limit for the Gemini key in Google Cloud / AI Studio.

## Photo: camera opens directly on phones (Oct 30)
- Problem: on the phone, "photo" only opened the gallery. The file input had a fixed list of types and no `capture`, so Android offered only files/photos.
- `VisualMatcherModal.tsx`: two buttons, **Take a photo** (opens the back camera directly: `accept="image/*" capture="environment"`) and **Choose from gallery** (`accept="image/*"`). On PC the drag & drop area stays; on touch screens it is hidden (the two buttons are enough).
- Big camera photos (often 5–20 MB) are shrunk in the browser before sending (longest side 1600 px, JPEG 85%), usually to a few hundred KB: faster, cheaper, and they no longer fail the 5 MB limit. Pictures the browser cannot open show the "unsupported format" message; originals over 25 MB get "This photo is too large…".
- `tests/e2e_photo_errors.py`: uses the gallery input by test id; new checks for both buttons, `capture=environment`, the camera chooser opening, and a 22 MB camera photo being sent as a JPEG under 1.5 MB. Translations EN/DE/RO added ("Max 5 MB" label removed).

## PC layout step 2: product, search, saved, alerts (Oct 30)
Only for wide screens (1024 px and up, `useIsDesktop` = Tailwind `lg`). Phones and tablets render exactly the old screens (the desktop views are separate branches, not extra hidden markup).
- `src/hooks/useIsDesktop.ts`: matchMedia `(min-width: 1024px)`.
- `src/App.tsx`: `WIDE_SCREENS` = home, product-overview, search, saved, alerts use the full width on PC; the other screens stay a centered phone-width column for now. New props passed to the product and saved screens.
- **Product** (`ProductDesktopView.tsx`, used by `ProductOverviewScreen` on PC): image + summary (best total price, Price alert, Save, "Go to <store>"); offers table sorted by total price (price, delivery, total, difference to the best, delivery time, "To the store" → the existing leave-site dialog; store name → offer details); price-history mini chart from the product's history with "Lowest price in this history" (no 30-day claim) and link to the full history; quick alert box (uses the same alert logic and limits; shows "Update" when an alert exists); where-to-look stores. Note under the table: prices incl. VAT, store price counts, ordered by total price, not by commission; affiliate note only if an offer is an affiliate link.
- **Search** (`SearchScreen.tsx`): filters on the left built from the results (category, price min/max, free shipping, store), sort select, photo/barcode buttons, products in 3 columns. Native duplicate clear (×) of the search field hidden.
- **Saved** (`SavedScreen.tsx`): collections on the left (vertical list, new collection, limit meter "n of limit saved"), products as a table: price now, change since saved (uses the stored `savedPrice`), alert target or "+ Set alert" (opens the alert screen for that product), collections, open, remove.
- **Alerts** (`AlertsScreen.tsx`): banner when a target is reached, table (target, price now, status / amount still to go, open, delete), the honest "how it works now" note and "Create" on the side (below the table until 1280 px).
- Tables fit without horizontal scrolling at 1024 and 1280 px in EN/DE/RO (checked).
- New tests: `e2e_pc_product.py`, `e2e_pc_search.py`, `e2e_pc_saved.py`, `e2e_pc_alerts.py` (each also checks the phone layout is unchanged). `unit_i18n.ts`: 'Total' and 'Status' allowed identical. EN/DE/RO texts added.
- Full suite run: all pass (e2e_reels_video skipped: needs a local video fixture).

## PC layout step 3: offer details, comparison, history, alert, Reels, settings/legal (Oct 30)
Only for wide screens (1024 px+); phones and tablets keep the old screens (separate branches, same data and handlers).
- **Comparison** (`App.tsx`): on PC "offers-comparison" shows the PC product page, which already contains the full offers table. On phones the comparison screen stays as it was.
- **Offer details** (`BreakdownScreen.tsx`): two columns: product, price breakdown and store details on the left; final price with "Go to store", other offers (click switches the offer, "Back to the comparison") and a mini history on the right. No fixed bottom bar on PC. New optional props `onSelectOffer`, `onBackToComparison`.
- **Price history** (`PriceHistoryScreen.tsx`): metrics + larger chart on the left, alert slider and "versus history" on the right (same sections as on the phone, rearranged).
- **Set alert** (`SetPriceAlertScreen.tsx`): product picture, best price, lowest in history on the left; target price, quick levels, notification note and buttons on the right.
- **Reels** (`ProductReelsScreen.tsx`): three columns via CSS grid (filters and categories on the left, reel in the middle, product panel on the right), grid view 4 per row; the mouse wheel moves one reel per scroll gesture (repeats within 600 ms ignored). Arrows and keyboard keep working.
- **Settings and legal** (`App.tsx`): side menu (Account settings, Impressum, Privacy, Terms) and the page in a white card; legal text in a readable column (max ~720 px).
- Text fix (`SettingsScreen.tsx`, DE/RO): "Sign in to sync saved products, alerts and collections…" (Reels are not synced; it said Reels before).
- `WIDE_SCREENS` now: home, product-overview, offers-comparison, breakdown, price-history, set-alert, search, saved, alerts, product-reels, settings, legal. Remaining phone-width screens on PC: see-all, visual-result, shared-list.
- New tests: `e2e_pc_details.py`, `e2e_pc_reels.py`, `e2e_pc_settings_legal.py`. Full suite: all pass (e2e_reels_video skipped: needs a local video fixture). `server.ts` unchanged since the security update.

## Photo analysis: fallback model when Google is overloaded (Oct 30, owner OK for server.ts)
- Render log showed `503 UNAVAILABLE "This model is currently experiencing high demand"` from Google for `gemini-3.8-flash`: an overload on Google's side, not a bug in the app.
- `server.ts`: models are tried in order `gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite` (stable models listed on ai.google.dev/gemini-api/docs/models). Only a temporary error (503/429/UNAVAILABLE/RESOURCE_EXHAUSTED) moves to the next model; other errors stop. The order can be changed in Render with `GEMINI_MODELS=modelA,modelB` without code changes. `/api/health` now also shows `fallbackModels`.
- When all models are busy the server answers `503 {code: "GEMINI_BUSY"}` (was a 500 with Google's raw JSON); the app retries and then shows its "very busy" message.
- For local tests only: `GEMINI_TEST_BASE_URL` points the server at a fake Gemini, and only with a key starting with `test-` (a real key is never sent there). New `tests/e2e_gemini_fallback.py`.

## Find a product: free ways first, photo last and limited (Oct 30)
Goal: most people search for free (name, link, barcode); photo analysis (a paid Google call each time) only when needed.
- **Home** (`HomeScreen.tsx`): the find card lists, in this order, Paste link (FREE), Scan barcode (FREE, "the code with lines on the box or the store label"), Take a photo ("only if you don't know the name and have no code", 3 / DAY).
- **Scanner** (`VisualMatcherModal.tsx`): tabs in the order Link, Barcode, Photo. Barcode tab: a "Which code?" box (EAN with vertical lines on the box or price label, 8 or 13 digits, QR codes do not work); manual entry stays. Photo tab: "Faster without a photo" tip with "I'll type the name" (goes to search) and "Scan the barcode".
- **Photo analysis only with a free account, 3 per day** (`utils/limits.ts` `photosPerDay`: visitors 0, accounts 3). Visitors see "Photo search needs a free account" with Create an account / I already have an account. Accounts see "n of 3 photo analyses left today"; after 3, a message instead of the buttons. The counter is per device and day (`utils/photoQuota.ts`) and counts only successful analyses.
- **Server limits** (`server.ts`), now changeable in Render without new code: `PHOTO_PER_MINUTE` (default 5), `PHOTO_PER_VISITOR_DAY` (default 10), `PHOTO_SITE_PER_DAY` (default 300; was 500). These protect the costs even if someone bypasses the app.
- Later: more photos per day as part of a paid plan (only the numbers in `limits.ts` and Render change).
- Tests: `e2e_photo_errors.py` signs in with the local test account and checks the counter, the daily limit, a new day, and the visitor gate; `e2e_pasii_3_5.py` and `e2e_pasul_7_toate_produsele.py` use the new barcode button name; `e2e_server_security.py` updated to 5 per minute. Full suite: all pass.

## Results show the cheapest store; store badges; no UVP-based discount claims (Oct 30)
- **Search results** (`SearchScreen.tsx`, phone list and PC grid): each product shows "cheapest at <store>" (the offer with the lowest total). The red "-x% vs. list price" is gone. The sort option is now named "Furthest below the RRP" (it compares with the manufacturer's price, so it says so).
- **Product page, phone** (`ProductOverviewScreen.tsx`): no struck-through "old price" and no "-24% OFF · You save 90 €". If the product has a manufacturer price, it is shown neutrally: "Manufacturer's recommended price (RRP / UVP): 419,00 €". Reason: the Ovosearch plan does not use UVP or "old prices" as proof of a reduction (PAngV §11); real drops will be computed against our own 30-day history.
- **Home "Price drops" and "See all"**: the demo badges ("-24%", "SAVE 42 €") are shown as a neutral "Price drop" label; the demo data stay unchanged (still used for ordering in "See all").
- **Store badges** (`StoreBadge.tsx`): initials next to the store name in the phone offers list and the PC offers table. If a data source later provides an official store logo (`StoreOffer.storeLogo`, e.g. from Awin with the store's permission), the logo is shown instead; a broken or unsafe logo URL falls back to the initials.
- Tests: `e2e_home_rails.py` now checks the neutral badge and that no "-x%" is shown. Full suite: all pass.

## PC layout: last screens (Oct 30)
- **See all** (Home → "See all" for Price drops / New products, `SeeAllScreen.tsx`): full width on PC, cards in 3 columns; sort chips aligned. Phones: list as before.
- **Photo / link result** (`visual-result`) and **shared list**: a comfortable reading width on PC (max ~768 px and ~896 px; the shared list in 2 columns) instead of a phone column (`MEDIUM_SCREENS` in `App.tsx`).
- Now no screen stays phone-width on PC.
- New `tests/e2e_pc_rest.py`. Related tests pass.

## Ovosearch step 1 groundwork: Awin feed reader (Oct 31) – not used by the app yet
- `src/feeds/awinFeed.ts`: reads an Awin product feed (CSV) into clean offers and groups them by EAN. Handles quoted CSV (commas, quotes, new lines), BOM/CRLF, German and English price formats, and different column names. Keeps only EUR prices > 0, in-stock rows and safe http(s) links. Total = price + delivery; a missing delivery cost stays unknown (never shown as free). The store's RRP is kept only as information (no discount claims). Matching only by a valid EAN/GTIN (GTIN-14/UPC normalized); rows without a valid code are kept apart, never matched by title. One offer per store (the cheapest if listed twice); `mergeFeedProducts` combines several stores.
- `scripts/try-feed.ts`: try a downloaded feed file locally (`npx tsx scripts/try-feed.ts feed.csv.gz`).
- `tests/unit_awin_feed.ts` (18 checks, invented test data).
- Nothing in the live app, `server.ts` or Supabase changes. Next (after the first Awin approval and the owner's OK): a scheduled job that downloads the feeds, stores only price changes in Supabase, and `priceProvider` switches from demo to real data.

## Reels on phones: full screen, like TikTok (Oct 31)
Only below 1024 px (`max-lg:`); the PC three-column Reels stay as they were.
- `ProductReelsScreen.tsx`: the Reels screen covers the whole phone screen (no frame, no margins); the picture/video fills it (`object-cover`). Back, the REELS/DEMO label, the filters and the grid button float transparently at the top; the "demo preview" label sits just below them.
- On the right over the picture: Save, Alert, Share and a new **Details** button (opens the product). Labels have a shadow so they stay readable on light pictures.
- At the bottom over the picture: category, name (larger), "from X €" and one big "Compare N prices" button; "Compare" opens the existing bottom sheet with the stores. Subtitle, Brand/Model/Color chips and the old "View details" button are hidden on phones (the catalog facts are on the product page). Own reels keep their "this device only" label and their own spec chips. "n of m" stays for screen readers only. The delete button of an own reel moved below the top bar.
- While Reels are open on a phone the page behind does not scroll; it is unlocked again when leaving.
- `tests/e2e_reels.py`: leaves Reels with Back before opening Saved; new checks for full screen, info at the bottom, Compare visible without scrolling, side Details button, scroll unlocked. Reels tests (with and without "add reel"), add-reel, demo reel, PC reels, wide layout: all pass.

## Iri, mascota OvoPrice (fix17)

- Pozele lui Iri (9 poziții, fundal transparent, WebP de ~50–75 KB) în `public/mascot/`.
- `src/components/Iri.tsx`: Iri se mișcă din CSS (respiră, sare, intră cu „pop”, se clatină). La atingere sau click se gâdilă: se strânge, râde o clipă și spune ceva în balonaș. La 5 atingeri la rând sare în confetti. Pe Android telefonul vibrează scurt. Cine a cerut „mai puține animații” vede un Iri nemișcat.
- `IriToast`: mesaj jos, timp de 3 secunde, după „Salvează” (Iri cu inima) și după ce setezi o alertă (Iri cu clopoțelul). Nu apare în Reels și nu blochează click-urile.
- `src/components/WelcomeSheet.tsx`: ghidul de la prima vizită, cu 3 ecrane care se pot sări. Apare o singură dată pe browser și nu apare peste o listă partajată. Pe PC e o fereastră pe mijloc. Browserele automate (testele) nu îl primesc decât cu `?welcome=1`.
- Acasă: cardul „Iri întreabă: Ce vânăm azi?” cu Iri și căruciorul. Exemplele apar doar în demo și sunt numai produse care există în catalog.
- Căutare: Iri cu lupa cât timp caută. Când nu găsește nimic apare Iri nedumerit.
- Salvate și Alerte goale: Iri doarme.
- Produs, pe telefon și PC: Iri sare în confetti lângă cel mai mic preț.
- Unde nu apare Iri: tabelul de oferte, detaliile de preț, istoricul prețului, setările, paginile legale, Reels.
- Texte noi în DE și RO.
- Test nou: `tests/e2e_iri.py`. Rulează pe serverul offline de dezvoltare.

## Titlu Acasă și „Alege o poză” pe PC (fix18)

- Am scos eticheta „COST TOTAL CU LIVRARE”.
- Titlul nou e „Prețul real, cu livrare inclusă.”, cu rândul de sub el „Comparăm magazine din Germania și Austria și îți arătăm unde plătești cel mai puțin.”. Titlul vechi spunea „din toate magazinele”, ceea ce nu e adevărat.
- Pe PC: pe Acasă, „Fă o poză” devine „Alege o poză”, cu textul „De pe calculator…”. În fereastra pentru poze nu mai apare butonul de cameră, rămâne un singur buton, „Alege o poză”. Pe telefon nu se schimbă nimic.
- Teste: `e2e_photo_errors` are 3 verificări noi pentru PC. `e2e_wide_layout` caută titlul nou.

## Bara „Ai copiat deja linkul unui produs?” mutată sus (fix19)

- Bara stă acum imediat sub căutare, pe telefon și pe PC. Înainte era jos de tot pe Acasă.
- Textele noi explică ce face: „Copiază linkul produsului din magazin, apoi apasă butonul: îl lipim noi și îți arătăm unde e mai ieftin.” Butonul se numește „Lipește linkul copiat”.
- Pe telefon butonul e mare, pe toată lățimea, sub text.
- `e2e_pasii_3_5` caută butonul după numele nou.
