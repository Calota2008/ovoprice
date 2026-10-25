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
