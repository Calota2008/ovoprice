import type { Lang } from '../i18n';
import type { LegalPage } from '../utils/legal';

/**
 * DRAFT legal texts. They describe what the app actually does today (no analytics, no ads, no
 * tracking cookies; accounts on Supabase; sign-in e-mails through Resend; photo analysis through
 * Google Gemini). They are NOT legal advice and must be reviewed by a specialist (or replaced by a
 * generated text, e.g. from eRecht24 or IT-Recht Kanzlei) before the app is published.
 *
 * Tokens {name} {address} {email} {phone} are replaced with the operator details.
 * German is the authoritative version for users in Germany and Austria.
 */
export interface LegalSection {
  h: Record<Lang, string>;
  p: Record<Lang, string[]>;
}
export interface LegalDoc {
  title: Record<Lang, string>;
  sections: LegalSection[];
}

export const LEGAL_UPDATED: Record<Lang, string> = {
  en: 'Draft, October 2026',
  de: 'Entwurf, Oktober 2026',
  ro: 'Ciornă, octombrie 2026',
};

const impressum: LegalDoc = {
  title: { en: 'Legal notice (Impressum)', de: 'Impressum', ro: 'Informații legale (Impressum)' },
  sections: [
    {
      h: { en: 'Provider of this service', de: 'Anbieter dieses Dienstes', ro: 'Furnizorul serviciului' },
      p: {
        en: ['{name}', '{address}'],
        de: ['{name}', '{address}'],
        ro: ['{name}', '{address}'],
      },
    },
    {
      h: { en: 'Contact', de: 'Kontakt', ro: 'Contact' },
      p: {
        en: ['E-mail: {email}', 'Phone: {phone}'],
        de: ['E-Mail: {email}', 'Telefon: {phone}'],
        ro: ['E-mail: {email}', 'Telefon: {phone}'],
      },
    },
    {
      h: { en: 'About this service', de: 'Über diesen Dienst', ro: 'Despre acest serviciu' },
      p: {
        en: ['OvoPrice is a price-comparison service. It is not a shop: purchases are made on the merchant\'s own website.'],
        de: ['OvoPrice ist ein Preisvergleichsdienst und kein Online-Shop. Gekauft wird auf der Website des jeweiligen Händlers.'],
        ro: ['OvoPrice este un serviciu de comparare a prețurilor, nu un magazin. Cumpărarea se face pe site-ul comerciantului.'],
      },
    },
  ],
};

const privacy: LegalDoc = {
  title: { en: 'Privacy notice (Datenschutz)', de: 'Datenschutzerklärung', ro: 'Politica de confidențialitate' },
  sections: [
    {
      h: { en: '1. Who is responsible', de: '1. Verantwortlicher', ro: '1. Operatorul de date' },
      p: {
        en: ['Responsible for processing your data is {name}, {address}, e-mail {email}.'],
        de: ['Verantwortlich für die Datenverarbeitung ist {name}, {address}, E-Mail {email}.'],
        ro: ['Responsabil pentru prelucrarea datelor este {name}, {address}, e-mail {email}.'],
      },
    },
    {
      h: { en: '2. Using the app without an account', de: '2. Nutzung ohne Konto', ro: '2. Folosirea fără cont' },
      p: {
        en: [
          'Language, country, saved products, price alerts, recent searches and your own Reels are stored only in your browser (local storage and IndexedDB) on your device. They are not sent to our servers. You can delete them by clearing the site data in your browser.',
          'These entries are technically necessary to provide the functions you ask for. We do not use advertising or tracking cookies and do not use analytics tools at this time. If that changes, we will update this notice and ask for your consent where the law requires it.',
        ],
        de: [
          'Sprache, Land, gespeicherte Produkte, Preisalarme, letzte Suchen und eigene Reels werden nur in deinem Browser (Local Storage und IndexedDB) auf deinem Gerät gespeichert. Sie werden nicht an unsere Server gesendet. Du kannst sie löschen, indem du die Websitedaten in deinem Browser entfernst.',
          'Diese Einträge sind technisch erforderlich, um die von dir gewünschten Funktionen bereitzustellen. Wir setzen derzeit keine Werbe- oder Tracking-Cookies und keine Analysedienste ein. Ändert sich das, aktualisieren wir diese Erklärung und holen, wo gesetzlich nötig, deine Einwilligung ein.',
        ],
        ro: [
          'Limba, țara, produsele salvate, alertele de preț, căutările recente și Reels-urile tale proprii sunt păstrate doar în browserul tău (local storage și IndexedDB), pe dispozitivul tău. Nu sunt trimise către serverele noastre. Le poți șterge golind datele site-ului din browser.',
          'Aceste date sunt necesare tehnic pentru funcțiile pe care le ceri. Nu folosim cookie-uri de publicitate sau de urmărire și, momentan, nici instrumente de analiză. Dacă se schimbă, actualizăm această politică și cerem consimțământul acolo unde legea o cere.',
        ],
      },
    },
    {
      h: { en: '3. Hosting and connection data', de: '3. Hosting und Verbindungsdaten', ro: '3. Găzduire și date de conexiune' },
      p: {
        en: ['The site is hosted by Render (server location Frankfurt, Germany). To deliver the site, the hosting provider processes technical connection data such as your IP address and the time of the request. Legal basis: Art. 6(1)(f) GDPR (secure and stable operation). The domain name is managed with DNS records at Cloudflare. Fonts and images are served from our own server; the app does not load anything from third-party servers just by being opened.'],
        de: ['Die Website wird bei Render gehostet (Serverstandort Frankfurt am Main). Zur Auslieferung der Website verarbeitet der Hosting-Anbieter technische Verbindungsdaten wie deine IP-Adresse und den Zeitpunkt der Anfrage. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer und stabiler Betrieb). Die Domain wird über DNS-Einträge bei Cloudflare verwaltet. Schriften und Bilder werden von unserem eigenen Server ausgeliefert; allein durch das Öffnen der App wird nichts von Servern Dritter geladen.'],
        ro: ['Site-ul este găzduit la Render (server în Frankfurt, Germania). Pentru a livra site-ul, furnizorul de găzduire prelucrează date tehnice de conexiune, precum adresa IP și momentul cererii. Temei legal: art. 6 alin. (1) lit. f GDPR (funcționare sigură și stabilă). Domeniul este gestionat prin înregistrări DNS la Cloudflare. Fonturile și imaginile sunt servite de propriul nostru server; simpla deschidere a aplicației nu încarcă nimic de pe servere terțe.'],
      },
    },
    {
      h: { en: '4. Account', de: '4. Konto', ro: '4. Contul' },
      p: {
        en: [
          'If you create an account, we store your e-mail address, the name you choose (or the name from your Google account), your country and your language. Today, saved products, alerts and Reels are not synced and stay on your device.',
          'Accounts and the database run on Supabase (region Frankfurt, Germany). Sign-in codes are sent by e-mail through Resend (EU region). If you sign in with Google, Google receives your sign-in request and tells us your e-mail address and name; Google\'s own privacy notice applies there. Legal basis: Art. 6(1)(b) GDPR (providing the account you asked for).',
          'We keep your account data until you delete your account. You can do that yourself in Account settings; the account and its profile are then removed.',
        ],
        de: [
          'Wenn du ein Konto erstellst, speichern wir deine E-Mail-Adresse, den von dir gewählten Namen (oder den Namen aus deinem Google-Konto), dein Land und deine Sprache. Gespeicherte Produkte, Alarme und Reels werden derzeit nicht synchronisiert und bleiben auf deinem Gerät.',
          'Konten und Datenbank laufen bei Supabase (Region Frankfurt, Deutschland). Anmeldecodes werden per E-Mail über Resend (EU-Region) versendet. Meldest du dich mit Google an, erhält Google deine Anmeldeanfrage und teilt uns deine E-Mail-Adresse und deinen Namen mit; dabei gilt die Datenschutzerklärung von Google. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des gewünschten Kontos).',
          'Wir speichern deine Kontodaten, bis du dein Konto löschst. Das kannst du selbst in den Kontoeinstellungen tun; Konto und Profil werden dann entfernt.',
        ],
        ro: [
          'Dacă îți creezi un cont, păstrăm adresa ta de e-mail, numele ales de tine (sau numele din contul Google), țara și limba. Momentan, produsele salvate, alertele și Reels nu se sincronizează și rămân pe dispozitivul tău.',
          'Conturile și baza de date rulează pe Supabase (regiunea Frankfurt, Germania). Codurile de conectare se trimit prin e-mail cu Resend (regiune UE). Dacă te conectezi cu Google, Google primește cererea de conectare și ne comunică adresa de e-mail și numele; se aplică politica Google. Temei legal: art. 6 alin. (1) lit. b GDPR (furnizarea contului cerut).',
          'Păstrăm datele contului până îți ștergi contul. O poți face singur din Setările contului; contul și profilul sunt apoi eliminate.',
        ],
      },
    },
    {
      h: { en: '5. Photo recognition', de: '5. Fotoerkennung', ro: '5. Recunoașterea din poză' },
      p: {
        en: ['If you choose a photo to identify a product, the image is sent through our server to Google\'s Gemini API for analysis. We do not store it on our server. Google may process it outside the EU; its terms for the API apply. Please do not upload photos of people. You decide yourself whether to use this function.'],
        de: ['Wenn du ein Foto zur Produkterkennung auswählst, wird das Bild über unseren Server zur Analyse an die Gemini-API von Google gesendet. Wir speichern es nicht auf unserem Server. Google kann es auch außerhalb der EU verarbeiten; es gelten die Bedingungen von Google für die API. Bitte lade keine Fotos von Personen hoch. Ob du diese Funktion nutzt, entscheidest du selbst.'],
        ro: ['Dacă alegi o poză pentru a identifica un produs, imaginea este trimisă prin serverul nostru către API-ul Gemini al Google pentru analiză. Nu o păstrăm pe serverul nostru. Google o poate prelucra și în afara UE; se aplică condițiile Google pentru API. Te rugăm să nu încarci poze cu persoane. Tu decizi dacă folosești această funcție.'],
      },
    },
    {
      h: { en: '6. Voice search and external links', de: '6. Sprachsuche und externe Links', ro: '6. Căutarea vocală și linkurile externe' },
      p: {
        en: [
          'Voice search uses the speech recognition of your browser. Depending on the browser, the audio may be processed by its provider; we do not receive the recording.',
          'When you open a merchant\'s website, you leave OvoPrice. The privacy notice of that merchant applies there.',
        ],
        de: [
          'Die Sprachsuche nutzt die Spracherkennung deines Browsers. Je nach Browser kann die Aufnahme beim Anbieter des Browsers verarbeitet werden; wir erhalten die Aufnahme nicht.',
          'Wenn du die Website eines Händlers öffnest, verlässt du OvoPrice. Dort gilt die Datenschutzerklärung des Händlers.',
        ],
        ro: [
          'Căutarea vocală folosește recunoașterea vocală a browserului. În funcție de browser, înregistrarea poate fi prelucrată de furnizorul acestuia; noi nu primim înregistrarea.',
          'Când deschizi site-ul unui comerciant, părăsești OvoPrice. Acolo se aplică politica de confidențialitate a comerciantului.',
        ],
      },
    },
    {
      h: { en: '7. Your rights', de: '7. Deine Rechte', ro: '7. Drepturile tale' },
      p: {
        en: [
          'You have the right to access, correction, deletion, restriction of processing, data portability and objection (Art. 15 to 21 GDPR). Where processing is based on consent, you can withdraw it at any time. Write to {email}.',
          'You also have the right to complain to a data protection authority, for example the one responsible for your place of residence or for our registered location.',
        ],
        de: [
          'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Beruht die Verarbeitung auf einer Einwilligung, kannst du sie jederzeit widerrufen. Schreibe an {email}.',
          'Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, z. B. bei der für deinen Wohnort oder für unseren Sitz zuständigen Behörde.',
        ],
        ro: [
          'Ai dreptul la acces, rectificare, ștergere, restricționarea prelucrării, portabilitatea datelor și opoziție (art. 15 – 21 GDPR). Dacă prelucrarea se bazează pe consimțământ, îl poți retrage oricând. Scrie la {email}.',
          'Ai și dreptul de a depune o plângere la o autoritate de protecție a datelor, de exemplu cea de la locul tău de reședință sau de la sediul nostru.',
        ],
      },
    },
  ],
};

const terms: LegalDoc = {
  title: { en: 'Terms of use', de: 'Nutzungsbedingungen', ro: 'Termeni de utilizare' },
  sections: [
    {
      h: { en: '1. What OvoPrice is', de: '1. Was OvoPrice ist', ro: '1. Ce este OvoPrice' },
      p: {
        en: ['OvoPrice helps you find a product and compare offers from different merchants. OvoPrice does not sell products. A purchase is a contract between you and the merchant, on the merchant\'s website.'],
        de: ['OvoPrice hilft dir, ein Produkt zu finden und Angebote verschiedener Händler zu vergleichen. OvoPrice verkauft keine Produkte. Ein Kauf ist ein Vertrag zwischen dir und dem Händler auf dessen Website.'],
        ro: ['OvoPrice te ajută să găsești un produs și să compari ofertele mai multor comercianți. OvoPrice nu vinde produse. Cumpărarea este un contract între tine și comerciant, pe site-ul acestuia.'],
      },
    },
    {
      h: { en: '2. Prices and availability', de: '2. Preise und Verfügbarkeit', ro: '2. Prețuri și disponibilitate' },
      p: {
        en: ['Prices, delivery costs and availability can change at any time and may differ from what is shown here. Before you buy, check the final price on the merchant\'s website. While the app shows the "Demo data" notice, all offers are examples and are not real.'],
        de: ['Preise, Versandkosten und Verfügbarkeit können sich jederzeit ändern und von der Anzeige hier abweichen. Prüfe vor dem Kauf den Endpreis auf der Website des Händlers. Solange die App den Hinweis „Demo-Daten“ zeigt, sind alle Angebote Beispiele und nicht real.'],
        ro: ['Prețurile, costurile de livrare și disponibilitatea se pot schimba oricând și pot diferi de ce se vede aici. Înainte de cumpărare, verifică prețul final pe site-ul comerciantului. Cât timp aplicația afișează mesajul „Date demo”, toate ofertele sunt exemple și nu sunt reale.'],
      },
    },
    {
      h: { en: '3. Affiliate links', de: '3. Affiliate-Links', ro: '3. Linkuri de afiliere' },
      p: {
        en: ['Once real offers are shown, some links to merchants may be affiliate links (marked as advertising). If you buy through such a link, we may receive a commission from the merchant. The price you pay does not change, and the commission does not decide the order of the offers.'],
        de: ['Sobald echte Angebote angezeigt werden, können einige Links zu Händlern Affiliate-Links sein (als Werbung gekennzeichnet). Kaufst du über einen solchen Link, erhalten wir möglicherweise eine Provision vom Händler. Dein Preis ändert sich dadurch nicht, und die Provision bestimmt nicht die Reihenfolge der Angebote.'],
        ro: ['Când vor fi afișate oferte reale, unele linkuri către comercianți pot fi linkuri de afiliere (marcate ca publicitate). Dacă cumperi printr-un astfel de link, putem primi un comision de la comerciant. Prețul tău nu se schimbă, iar comisionul nu stabilește ordinea ofertelor.'],
      },
    },
    {
      h: { en: '4. Your account and content', de: '4. Dein Konto und Inhalte', ro: '4. Contul și conținutul tău' },
      p: {
        en: ['Keep your sign-in details to yourself. Only upload photos, videos and links that you may use, and nothing unlawful or that violates the rights of others. You can delete your account at any time in Account settings.'],
        de: ['Halte deine Zugangsdaten geheim. Lade nur Fotos, Videos und Links hoch, die du verwenden darfst, und nichts Rechtswidriges oder Rechte Dritter Verletzendes. Dein Konto kannst du jederzeit in den Kontoeinstellungen löschen.'],
        ro: ['Păstrează datele de conectare pentru tine. Încarcă doar poze, videoclipuri și linkuri pe care ai voie să le folosești și nimic ilegal sau care încalcă drepturile altora. Îți poți șterge contul oricând din Setările contului.'],
      },
    },
    {
      h: { en: '5. Liability', de: '5. Haftung', ro: '5. Răspundere' },
      p: {
        en: ['We take care with the information shown but cannot guarantee that it is complete, current or error-free. Liability under mandatory law, for example for intent, gross negligence, injury to life, body or health, or under the Product Liability Act, is not affected.'],
        de: ['Wir bemühen uns um sorgfältige Angaben, können aber nicht garantieren, dass sie vollständig, aktuell oder fehlerfrei sind. Die Haftung nach zwingendem Recht, etwa bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit oder nach dem Produkthaftungsgesetz, bleibt unberührt.'],
        ro: ['Ne străduim să afișăm informații corecte, dar nu putem garanta că sunt complete, actuale sau fără erori. Răspunderea prevăzută de legea imperativă, de exemplu pentru intenție, culpă gravă, vătămarea vieții, integrității corporale sau sănătății, rămâne neschimbată.'],
      },
    },
    {
      h: { en: '6. Changes', de: '6. Änderungen', ro: '6. Modificări' },
      p: {
        en: ['We may change these terms for good reasons, for example when functions change. The current version is always available in the app. Your statutory rights as a consumer remain unaffected.'],
        de: ['Wir können diese Bedingungen aus sachlichem Grund ändern, etwa wenn sich Funktionen ändern. Die aktuelle Fassung ist immer in der App abrufbar. Deine gesetzlichen Verbraucherrechte bleiben unberührt.'],
        ro: ['Putem modifica acești termeni din motive întemeiate, de exemplu când se schimbă funcțiile. Versiunea curentă este mereu disponibilă în aplicație. Drepturile tale legale de consumator rămân neschimbate.'],
      },
    },
  ],
};

export const LEGAL_DOCS: Record<LegalPage, LegalDoc> = { impressum, privacy, terms };
