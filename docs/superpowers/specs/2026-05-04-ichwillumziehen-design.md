# ichwillumziehen.com — Design-Dokument

**Datum:** 2026-05-04
**Domain:** ichwillumziehen.com
**Hosting:** Cloudflare Pages
**Backend:** Supabase (Auth + Postgres)
**Stack:** Vanilla HTML/CSS/JS (kein Build-Step)

---

## 1. Ziel & Scope

### Was es ist

Eine kostenlose, öffentliche Single-Page-Webseite mit zwei verbundenen Tools für Menschen, die umziehen wollen:

1. **Miet-Check** — Lifted aus der existierenden Wohnungscheck-Chrome-Extension. User gibt Profil (Einkommen, Krankenversicherung, Auto, Lebenshaltung), Stadt, Kaltmiete und Wohnfläche ein und sieht sofort, ob die Wohnung leistbar ist — inklusive realistischer Stadt-spezifischer Defaults.
2. **Umzugsbudget** — Lifted aus `umzug_budget_board.html`. User legt Möbel/Deko/Werkzeuge mit Preis, Bild, Kauflink und Notiz an und sieht das Live-Total.

### Monetarisierung

- **Primary:** Native Affiliate-Cards (Amazon Partnernet + Awin-Partner wie CHECK24)
- **Secondary:** 1 einziger non-personalisierter AdSense-Slot ganz unten (nach FAQ)

### Was es nicht ist (out of scope für MVP)

- Umzugs-Checkliste, Ummeldungs-Helfer, Strom-Wechsel-Wizard, Lebenshaltungs-Vergleich-Stadtseiten
- In-place Edit von Wishlist-Items
- Kategorien / Priorität / Erledigt-Status für Wishlist
- Bild-Upload (nur URL-Input)
- Sharing-via-URL ohne Login
- Mehrsprachigkeit (Deutsch only)
- Realtime-Sync zwischen Geräten (nur On-Login-Sync)

---

## 2. Technology Stack & Hosting

| Komponente | Wahl | Begründung |
|---|---|---|
| Frontend | Vanilla HTML + CSS + JS | Konsistent mit existierenden Tools des Users (`umzug_budget_board.html`), kein Build-Step, schnellster Launch |
| CSS | Custom (kein Tailwind, kein Framework) | Existing Extension hat schon ein Design-System — direkt übernehmen |
| Auth + DB | Supabase (Free-Tier) | User kennt Stack von Tovaglia, Magic-Link out-of-the-box, Postgres + RLS |
| Supabase SDK | CDN-Import (`@supabase/supabase-js@2/+esm`) | Kein npm, kein Build |
| Hosting | Cloudflare Pages | User hat Tovaglia-Erfahrung damit; kostenlos, schnell, Git-Auto-Deploy |
| Domain | ichwillumziehen.com | Bereits gewählt |

---

## 3. Datei-Struktur

```
ichwillumziehen/
├── index.html              ← Hero + 2 Tool-Sektionen + FAQ + Footer
├── app.js                  ← Komplette Logik (s. Modul-Aufteilung)
├── styles.css              ← Design-System aus Extension lifted
├── city-data.json          ← Stadt-Liste + Multiplikatoren
├── impressum.html          ← Statische Seite
├── datenschutz.html        ← Statische Seite
├── _redirects              ← Cloudflare-Redirects (z.B. /miet-check → /#mietcheck)
├── _headers                ← CSP, X-Frame-Options etc.
└── icons/                  ← Favicon + OG-Images
```

### Modul-Aufteilung in `app.js` (logische Blöcke, eine Datei)

| Modul | Verantwortung |
|---|---|
| `cityData` | Lädt `city-data.json`, exposiert `getCityTier(name)` und `getMultipliers(name)` |
| `profile` | State + localStorage-I/O für `iwu_profile` |
| `mietcheck` | Affordability-Calculation (Strom, Heizung, Lebenshaltung, Verdict) |
| `wishlist` | CRUD für Items, Live-Total, Affiliate-Tag-Injection |
| `auth` | Supabase-Init, Magic-Link, `onAuthStateChange`-Handler |
| `sync` | Bidirektionaler localStorage ↔ Supabase Sync (LWW-Merge) |
| `consent` | Cookie-Banner-Logic, `iwu_consent`-State, AdSense-Init-Trigger |
| `ui` | Render-Funktionen, Event-Listener, Scroll-Behavior |

---

## 4. Daten-Modell

### 4.1 localStorage (anonymer User)

**Key: `iwu_profile`**
```js
{
  income: 2500,
  kv: "g" | "p",
  kvBetrag: 0,                    // bei "p" der monatliche PKV-Beitrag
  auto: "ja" | "nein",
  autoRate: 0,                    // bei "ja"
  autoBenzin: 0,
  autoVersicherung: 0,
  autoOepnv: 0,                   // bei "nein": Deutschlandticket-Kosten
  city: "München",
  lebenshaltung: {                // user-overrides; null = Default verwenden
    lebensmittel: 360,
    essen: null,
    gym: null,
    kleidung: null,
    handy: null,
    abos: null,
    urlaub: null,
    sparen: null,
    sonstiges: null
  },
  updatedAt: 1714800000000        // ms-timestamp für LWW-Merge
}
```

**Key: `iwu_wishlist`**
```js
[
  {
    id: "uuid-v4",
    name: "Sofa",
    priceCents: 49999,             // gespeichert als Cents (Float-Bugs vermeiden)
    imageUrl: "https://...",
    linkUrl: "https://...",
    note: "Wohnzimmer",
    createdAt: 1714800000000
  }
]
```

**Key: `iwu_consent`**
```js
{
  necessary: true,                  // immer true
  ads: false,                       // AdSense personalisierte Cookies
  decidedAt: 1714800000000
}
```

### 4.2 Supabase-Schema

```sql
-- 1 Zeile pro User
create table profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  income           integer,
  kv               text check (kv in ('g','p')),
  kv_betrag        integer default 0,
  auto             text check (auto in ('ja','nein')),
  auto_rate        integer default 0,
  auto_benzin      integer default 0,
  auto_versicherung integer default 0,
  auto_oepnv       integer default 0,
  city             text,
  lebenshaltung    jsonb default '{}'::jsonb,    -- nur user-overrides
  updated_at       timestamptz default now()
);

-- N Zeilen pro User
create table wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  price_cents integer not null,
  image_url   text,
  link_url    text,
  note        text,
  created_at  timestamptz default now()
);
create index wishlist_items_user_created on wishlist_items(user_id, created_at desc);

-- Row Level Security: jeder sieht nur seine eigenen Daten
alter table profiles enable row level security;
create policy "own profile select" on profiles
  for select using (auth.uid() = user_id);
create policy "own profile upsert" on profiles
  for insert with check (auth.uid() = user_id);
create policy "own profile update" on profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table wishlist_items enable row level security;
create policy "own items select" on wishlist_items
  for select using (auth.uid() = user_id);
create policy "own items insert" on wishlist_items
  for insert with check (auth.uid() = user_id);
create policy "own items update" on wishlist_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items delete" on wishlist_items
  for delete using (auth.uid() = user_id);
```

### 4.3 Sync-Strategie

**3 Zustände:**

| Zustand | Schreibt nach | Liest von |
|---|---|---|
| `ANON` (kein Login) | localStorage | localStorage |
| `FRESH_LOGIN` (gerade eingeloggt) | beide (Merge-Lauf) | beide (Merge-Lauf) |
| `ACTIVE` (eingeloggt) | beide (write-through) | localStorage (schneller) |

**Beim Login (`onAuthStateChange === "SIGNED_IN"`):**

```text
1. dbProfile  = supabase.from('profiles').select().eq('user_id', uid).maybeSingle()
2. localProfile = localStorage.getItem('iwu_profile')

   if (!dbProfile && !localProfile)   → noop (User ist neu)
   if (!dbProfile && localProfile)    → push localProfile → DB
   if (dbProfile && !localProfile)    → pull dbProfile → localStorage
   if (dbProfile && localProfile)     → LWW per updated_at
                                         winner schreibt in beide

3. dbItems    = supabase.from('wishlist_items').select().eq('user_id', uid)
   localItems = localStorage.getItem('iwu_wishlist')

   union per id:
     - items nur lokal → insert in DB
     - items nur in DB → push in localStorage
     - id-Konflikte (theoretisch unmöglich bei UUID-v4) → DB-Version wins
```

**Beim Logout:** localStorage bleibt **erhalten** (User behält seine Daten). Separater „Lokal löschen"-Button für privacy-bewusste User.

**Conflict-Resolution:** Stillschweigender Last-Write-Wins. Kein Modal, keine User-Auswahl. (Pragmatisch — der Edge-Case "User hat auf zwei Geräten unterschiedliche Daten" ist selten und nicht wertvoll genug für extra UX.)

---

## 5. Miet-Check Logik

### 5.1 Berechnungs-Formel

```js
// 1. Wohnungs-Nebenkosten (qm-basiert, Stadt-unabhängig)
const strom    = 50 + Math.max(0, qm - 40) * 0.5;
const heizung  = qm * 2.0;
const sonstNK  = 40 + 18 + 8;                            // Internet + GEZ + Haftpflicht
const warmmiete = kaltmiete + strom + heizung + sonstNK;

// 2. Lebenshaltung mit Stadt-Multiplier auf SELEKTIVE Kategorien
const eff = (id) => profile.lebenshaltung[id] ?? (defaults[id] * (cityMul[id] ?? 1.0));
const lebenshaltung =
  eff('lebensmittel') + eff('essen') + eff('gym') + eff('kleidung') +
  eff('handy') + eff('abos') + eff('urlaub') + eff('sparen') + eff('sonstiges');

// 3. Auto/Transport
const autoKosten = profile.auto === 'ja'
  ? profile.autoRate + profile.autoBenzin + profile.autoVersicherung
  : profile.autoOepnv;

// 4. Available für Wohnung
const totalOut    = profile.kvBetrag + autoKosten + lebenshaltung;
const availForRent = profile.income - totalOut;
const surplus      = availForRent - warmmiete;

// 5. Verdict
let verdict;
if      (surplus > 500) verdict = { tone: 'ok',   text: 'Ja, machbar.', sub: `+${surplus}€ Spielraum/Mo.` };
else if (surplus > 150) verdict = { tone: 'warn', text: 'Ja, aber knapp.', sub: `Nur +${surplus}€ Puffer.` };
else if (surplus > 0)   verdict = { tone: 'warn', text: 'Sehr knapp.', sub: `Nur +${surplus}€ übrig.` };
else                    verdict = { tone: 'bad',  text: 'Zu eng.', sub: `Dir fehlen ${Math.abs(surplus)}€/Mo.` };

// 6. Einmalkosten (informativ)
const einmalig = kaltmiete * 2 /* Kaution */ + 500 /* Renovierung */ + 2000 /* Möbel-Reserve */;
```

### 5.2 City-Tier-System (`city-data.json`)

**Designentscheidung:** Multiplikatoren wirken **nur auf 3 Kategorien** (`lebensmittel`, `essen`, `gym`). Bei den anderen Kategorien ist die regionale Varianz so klein, dass ein Multiplier falsche Genauigkeit vortäuscht. ÖPNV ist durch das Deutschlandticket (49€) bundesweit gleich.

```json
{
  "version": 1,
  "defaults": {
    "lebensmittel": 300,
    "essen": 100,
    "gym": 50,
    "kleidung": 80,
    "handy": 25,
    "abos": 35,
    "urlaub": 100,
    "sparen": 200,
    "sonstiges": 50,
    "oepnv": 49
  },
  "tiers": {
    "S":  { "label": "Sehr teuer",  "mul": { "lebensmittel": 1.20, "essen": 1.30, "gym": 1.40 } },
    "M":  { "label": "Teuer",       "mul": { "lebensmittel": 1.10, "essen": 1.15, "gym": 1.20 } },
    "L":  { "label": "Mittel",      "mul": { "lebensmittel": 1.00, "essen": 1.00, "gym": 1.00 } },
    "XL": { "label": "Günstiger",   "mul": { "lebensmittel": 0.92, "essen": 0.90, "gym": 0.80 } }
  },
  "cities": {
    "München": "S", "Frankfurt am Main": "S", "Hamburg": "S", "Stuttgart": "S",
    "Berlin": "M", "Köln": "M", "Düsseldorf": "M", "Heidelberg": "M", "Freiburg im Breisgau": "M",
    "Hannover": "L", "Bremen": "L", "Nürnberg": "L", "Dresden": "L", "Leipzig": "L",
    "Mainz": "L", "Karlsruhe": "L", "Wiesbaden": "L", "Münster": "L",
    "Bonn": "L", "Augsburg": "L", "Aachen": "L",
    "ANDERE": "XL"
  }
}
```

### 5.3 UX

- 3-Step-Flow: **Profil → Lebenshaltung → Wohnung**
- Stadt-Dropdown: ~20 Städte + „Andere Stadt" (= XL-Tier)
- Beim Stadt-Wechsel werden Lebenshaltungs-Defaults neu berechnet und als **Placeholder** in den Inputs angezeigt: `z.B. 360 (München-Schnitt)`
- User-Override: jeder Wert manuell überschreibbar → wird in `profile.lebenshaltung[id]` gespeichert
- Result-Card unten: Verdict (Farbe + Headline) + Surplus-Zahl + Budget-Breakdown + Einmalkosten-Hinweis

---

## 6. Umzugsbudget-Tool

### 6.1 Item-Felder

```js
{
  id: "uuid-v4",
  name: "Sofa",                  // required
  priceCents: 49999,             // required, immer Cents
  imageUrl: "https://...",       // optional
  linkUrl:  "https://...",       // optional — auto-tagged falls Amazon
  note:     "Wohnzimmer",        // optional
  createdAt: 1714800000000
}
```

Anzeige: `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`.

### 6.2 CRUD

- **Add** über Form: `name*`, `priceCents*`, `imageUrl?`, `linkUrl?`, `note?`. Submit → `unshift` (neueste zuerst)
- **Delete** per ✕-Button auf der Card
- **„Alles löschen"** mit Native-Confirm-Modal
- **Kein In-Place-Edit, keine Kategorien, keine Priorität, kein Erledigt-Status** für MVP

**Empty State:** Statt Demo-Items leere Liste mit Hinweis *„Füge dein erstes Item hinzu — Möbel, Deko, Werkzeuge. Bild und Kauflink optional."*

**Live-Total:** Summe aller `priceCents`, animiert (eased Counter), oben über der Liste.

### 6.3 Affiliate Auto-Tag (Amazon Partnernet)

```js
const AFFILIATE = {
  amazon: { tag: 'PLATZHALTER-21', enabled: true }
  // TODO: echten Tag aus Amazon-Partnernet eintragen vor Launch
};

function tagAffiliate(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (/(^|\.)amazon\.[a-z.]+$/.test(u.hostname) && AFFILIATE.amazon.enabled) {
      u.searchParams.set('tag', AFFILIATE.amazon.tag);
      return u.toString();
    }
  } catch (_) {}
  return url;
}
```

- Beim Render der Card wird `linkUrl` durch `tagAffiliate(linkUrl)` geschickt
- Die gespeicherte URL bleibt **ohne Tag** — Tag wird on-the-fly beim Anzeigen reingehängt
- Erweiterbar für weitere Programme (IKEA, Otto, Westwing) durch zusätzliche Branches

### 6.4 Affiliate-Disclosure (Pflicht — UWG §5a + Amazon-TOS)

1. **Permanenter Hinweis** über der Wishlist-Sektion:
   > „Manche Links sind Affiliate-Links. Wenn du über sie kaufst, bekommen wir eine kleine Provision — der Preis ändert sich für dich nicht."
2. **Pro-Link-Badge** auf der Card neben „Zum Shop": kleines `(Werbung)` in 10px, opacity 0.6 — nur bei Amazon-Links sichtbar
3. **In Datenschutzerklärung** eigener Abschnitt „Affiliate-Programme"

---

## 7. Auth-Flow (Supabase Magic-Link)

```
[Header "Anmelden"-Button]
    └─ Modal mit E-Mail-Input
        └─ supabase.auth.signInWithOtp({
             email,
             options: { emailRedirectTo: location.origin }
           })
            └─ "✓ Login-Link verschickt — schau in dein Postfach"

User klickt Link in Mail
    └─ Landet auf https://ichwillumziehen.com/#access_token=...
        └─ Supabase SDK extrahiert Token automatisch
            └─ onAuthStateChange("SIGNED_IN") feuert
                └─ sync()-Routine läuft (Section 4.3)
                    └─ Header zeigt: stef@…  [Abmelden]
```

**Sicherheit:**
- Magic-Link ist passwortlos → keine PWs zu leaken
- JWT läuft nach 1h ab + Refresh-Token-Rotation (Supabase-default)
- SDK übernimmt Token-Lifecycle vollständig

**Edge-Cases:**
- User klickt Magic-Link auf anderem Gerät → localStorage dort leer, DB hat Daten → sync pulled DB → localStorage. Funktioniert.
- User klickt Magic-Link auf gleichem Gerät → beide vorhanden → LWW-Merge.

---

## 8. UI/UX

### 8.1 Page-Layout (eine Scroll-Page)

```
┌ Sticky Header  ─────────────────────────────────────────────┐
│  ichwillumziehen   Miet-Check · Umzugsbudget · FAQ   [Anmelden] │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│                  Hero (groß, ~70vh)                              │
│           "Kannst du dir die Wohnung leisten?"                  │
│              [CTA Miet-Check]  [CTA Umzugsbudget]               │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  #mietcheck  (große Sektion, viel Padding)                      │
│  Profil-Wizard (3 Steps) → Result-Card                          │
│  ┌────────────────────────────────────────────────┐             │
│  │ 💡 Native Affiliate-Card: Strom & Internet …   │             │
│  └────────────────────────────────────────────────┘             │
├────────────────────────────────────────────────────────────────┤
│  #umzugsbudget  (große Sektion)                                 │
│  Disclosure-Hinweis                                              │
│  Item-Form + Wishlist-Cards + Live-Total                        │
│  ┌────────────────────────────────────────────────┐             │
│  │ 💡 Inspiration-Grid (3 Amazon-Cards)           │             │
│  └────────────────────────────────────────────────┘             │
│  ┌────────────────────────────────────────────────┐             │
│  │ 💡 Native Affiliate-Card: Umzugsfirma finden…  │             │
│  └────────────────────────────────────────────────┘             │
├────────────────────────────────────────────────────────────────┤
│  #faq  (4-5 SEO-Q&As, je ~150 Wörter)                           │
├────────────────────────────────────────────────────────────────┤
│  AdSense-Slot (1×, non-personalisiert, lazy-loaded)             │
├────────────────────────────────────────────────────────────────┤
│  Footer: Impressum · Datenschutz · Cookies · ichwillumziehen.com │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Design-System (aus Wohnungscheck-Extension lifted)

```css
:root {
  --bg:        #0e0e0e;     /* Seiten-Hintergrund */
  --bg-card:   #161616;     /* Cards */
  --bg-card-2: #1a1a1a;     /* Cards Hover/Active */
  --bg-lime:   #1a2000;     /* Lime-tinted (selected/highlight) */
  --border:    #2a2a2a;     /* Default Border */
  --text:      #f0ede8;     /* Primary Text */
  --muted:     #666;        /* Sekundär-Text */
  --accent:    #c8f060;     /* Lime — Headlines, CTAs, Success */
  --warn:      #fbbf24;     /* Amber — knapp */
  --bad:       #ff6b6b;     /* Rot — zu eng */

  --serif: 'DM Serif Display', serif;   /* Headlines, Zahlen, Verdicts */
  --sans:  'DM Sans', sans-serif;       /* Body, UI */
}
```

**Border-radii:** 9-11px für Cards, 14-16px für große Container, 4-6px für Badges.

**Animationen:** dezente fadeUp beim ersten Render, Easing `cubic-bezier(.2,.9,.2,1)`. Kein Blingbling.

**Responsive Breakpoints:**
- Mobile: < 720px (Form + Cards stapeln untereinander)
- Tablet: 720-1024px
- Desktop: > 1024px (Wishlist-Form + Cards nebeneinander)

### 8.3 FAQ-Sektion (SEO-Content)

4-5 Q&As, jeweils ~150 Wörter. Schema.org `FAQPage` Markup für Rich-Results in Google:

- „Wie viel Miete kann ich mir leisten?" (Faustregel 30%/40% Diskussion)
- „Was sind realistische Nebenkosten?" (Strom, Heizung, Internet, GEZ — Größenordnungen)
- „Wie viel kostet ein Umzug in Deutschland?" (DIY vs. Firma, Schätzwerte)
- „Kaltmiete oder Warmmiete — wo ist der Unterschied?"
- (optional) „Wie viel sollte ich für die Einrichtung einer Wohnung einplanen?"

---

## 9. Monetarisierung

### 9.1 Native Affiliate-Cards (Primary)

| Position | Card-Inhalt | Partner |
|---|---|---|
| Nach Miet-Check-Verdict | „Strom & Internet für deine neue Wohnung vergleichen" | CHECK24, Verivox (Awin) |
| In Umzugsbudget — Inspiration-Grid (3 Cards) | „Beliebt bei anderen Umziehern" — Couch, Werkzeug-Set, Umzugskartons | Amazon Partnernet |
| Unter Wishlist | „Umzugsfirma finden & vergleichen" | CHECK24-Umzug (Awin) |

Alle Cards:
- Sehen aus wie Tool-Elemente (gleiches Design-System)
- Klar markiert mit `(Werbung)`-Tag-Pill
- Lazy-loaded (Intersection Observer) — keine Bilder/Resources bevor User scrollt

### 9.2 AdSense (Secondary)

- **1 einziger Slot** ganz unten zwischen FAQ und Footer
- **Default = non-personalisiert** (Limited Ads-Mode) — ~50% des CPMs einer personalisierten Anzeige, aber sauber DSGVO-konform ohne komplexen Consent-Flow
- **Optional personalisiert**: Wenn der User im Cookie-Banner (Section 10.1) Personalisierung aktiviert → höhere CPMs
- Lazy-loaded via Intersection-Observer (Script erst bei Scroll-In)
- Setup: AdSense beantragen direkt nach Launch (Approval ~1-2 Wochen)
- Bis Approval: leerer `<ins>`-Tag, kein Loading

### 9.3 Affiliate-Programme — TODO vor Launch

- [ ] Amazon Partnernet anmelden, Tag eintragen (`AFFILIATE.amazon.tag`)
- [ ] Awin-Account anlegen, CHECK24-Strom/Internet-Programm beantragen
- [ ] Awin: CHECK24-Umzugsfirmen-Programm beantragen
- [ ] Optional: IKEA Partnerprogramm (Awin) für Wishlist-Inspiration
- [ ] Google AdSense beantragen (nach Launch + erstem Content)

---

## 10. DSGVO / Legal

### 10.1 Cookie-Banner

Custom-Implementation, ~80 Zeilen vanilla JS. Erscheint beim ersten Besuch, gespeichert in `iwu_consent`.

```
┌─────────────────────────────────────────────────────┐
│ Wir nutzen technisch notwendige Speicher (deine    │
│ Profildaten, Login-Status). Optional dürfen wir     │
│ personalisierte Werbung anzeigen.                   │
│                                                     │
│ ☑ Notwendig (immer aktiv)                          │
│ ☐ Personalisierte Werbung (AdSense)                │
│                                                     │
│ [Auswahl speichern]  [Alle akzeptieren]            │
└─────────────────────────────────────────────────────┘
```

**AdSense-Lade-Logik:**
- Bei nicht entschiedenem State (Banner sichtbar, keine Wahl): AdSense-Slot bleibt leer
- Nach Klick „Auswahl speichern" mit `consent.ads === false`: AdSense lädt im **Limited Ads-Mode** (non-personalisiert) via `?gdpr=1&gdpr_consent=...`
- Nach Klick „Alle akzeptieren" oder Toggle aktiviert: AdSense lädt **personalisiert**
- Footer-Link „Cookies" öffnet Modal zum Re-Edit der Wahl

### 10.2 Pflicht-Seiten

| Seite | Inhalt | Aufwand |
|---|---|---|
| Impressum | Pflicht: Name, Anschrift, E-Mail, ggf. USt-ID. **User liefert die Daten.** | Statisches HTML, ~10 Min |
| Datenschutz | Pflicht-Texte zu: Hosting (Cloudflare), Auth (Supabase), Affiliate (Amazon), Ads (Google AdSense). Generator empfohlen (`e-recht24.de` etc.) | Generator-Output einbauen, ~30 Min |
| Cookie-Settings | Re-Edit der `iwu_consent`-Wahl. Modal von Footer-Link. | Wiederverwendung der Banner-UI |

### 10.3 Affiliate-Disclosure

Bereits in Section 6.4 abgedeckt: permanenter Hinweis + Pro-Link-Badge + Datenschutz-Abschnitt.

---

## 11. Sicherheit & Performance

### 11.1 Sicherheit

- **`_headers`** mit:
  - `Content-Security-Policy` (erlaubt: self + Supabase-API + Google AdSense + Amazon-Bilder)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Supabase-Anon-Key** ist publisch (das ist by design) — alle Sicherheit liegt in den RLS-Policies (Section 4.2)
- **User-Input-Sanitization** für Wishlist-Items: HTML-Escape via `escapeHtml()` (siehe Original `umzug_budget_board.html` Z. 706)

### 11.2 Performance

- Vanilla, kein Framework → JS-Bundle < 30 KB (zzgl. Supabase-SDK ~70 KB)
- CSS < 15 KB
- `city-data.json` < 3 KB
- Fonts: DM Sans + DM Serif Display via Google Fonts mit `font-display: swap`
- Bilder: User-supplied, lazy-loaded mit `loading="lazy"`
- Affiliate-Cards: Inhalte lazy via Intersection-Observer (Bild/CTA erst sichtbar bei Scroll)
- Lighthouse-Ziel: > 90 in allen Kategorien

---

## 12. Zukünftige Erweiterungen (out of scope für MVP)

Nur als Anker dokumentiert — **nicht** im MVP zu bauen:

1. **Sharing-via-URL** für Wishlist (Hash-encodiert, ohne Login) — falls User danach fragen
2. **Stadt-Landingpages** für SEO (`/miet-check-muenchen` etc.) — falls Affordability-Tool Traktion zeigt
3. **In-Place-Edit** der Wishlist-Items
4. **Bild-Upload** statt URL via Supabase Storage
5. **Kategorien & Priorität** für Wishlist
6. **Realtime-Sync** zwischen Geräten (Supabase Realtime-Channel)
7. **Mehr Affiliate-Programme** (IKEA, Otto, Westwing)
8. **Umzugs-Checkliste** (interaktiv, SEO-stark)
9. **Ummeldung-Helfer** (welche Behörden/Versicherungen)
10. **Englische Version** (`/en/`)

---

## 13. Open Questions / Pre-Launch-TODOs

- [ ] Domain `ichwillumziehen.com` registrieren (User)
- [ ] Cloudflare Pages Projekt anlegen + Domain verknüpfen (User)
- [ ] Supabase-Projekt anlegen, Tables + RLS-Policies anwenden (Section 4.2)
- [ ] Amazon Partnernet anmelden, Tag eintragen
- [ ] Awin-Account, CHECK24-Programme beantragen
- [ ] AdSense beantragen (nach Launch)
- [ ] Impressum-Daten liefern (Name, Anschrift, E-Mail des Users)
- [ ] Datenschutzerklärung über Generator erstellen
- [ ] Erstes Lighthouse-Audit nach Launch

---

## 14. Definition of Done (MVP)

- [ ] Miet-Check funktioniert vollständig: 3 Steps, Stadt-Multiplier, Verdict, Breakdown, Einmalkosten
- [ ] Umzugsbudget funktioniert vollständig: Add, Delete, Clear-All, Live-Total, Amazon-Auto-Tag
- [ ] localStorage-Persistenz für beide Tools
- [ ] Optional Login via Magic-Link mit Supabase
- [ ] LWW-Sync zwischen localStorage und Supabase
- [ ] Mindestens 1 Native Affiliate-Card pro Tool-Sektion
- [ ] FAQ mit 4 Q&As (Schema.org Markup)
- [ ] Cookie-Banner + Impressum + Datenschutz
- [ ] Responsive Mobile/Tablet/Desktop
- [ ] Lighthouse > 90 in allen Kategorien
- [ ] Live deployed auf ichwillumziehen.com
