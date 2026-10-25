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
