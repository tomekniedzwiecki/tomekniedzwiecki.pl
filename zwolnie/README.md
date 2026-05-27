# Zwolnię Twoich pracowników — landing + panel

Strona pozyskiwania briefów od CEO + panel do zarządzania zgłoszeniami.

**Live preview:** otwórz `index.html` w przeglądarce (działa lokalnie, bez serwera).

## Struktura

```
zwolnie-etaty/
├── index.html              # Landing page (prowokacyjny hero + formularz briefa)
├── dziekuje.html           # Strona po wysłaniu briefa (z linkiem dla klienta)
├── panel/
│   ├── index.html          # Inbox briefów (twoja perspektywa)
│   ├── lead.html           # Szczegół briefa + AI analiza + notatki
│   └── dashboard.html      # Metryki / wykresy / pipeline
├── klient/
│   └── index.html          # Public view dla klienta (?token=...)
├── assets/
│   ├── styles.css          # Wspólny design system (dark premium)
│   ├── api.js              # CRUD na localStorage (modular, Supabase-ready)
│   └── ai-analysis.js      # Mock AI - heurystyczna analiza briefa
└── README.md
```

## Jak to działa

1. **Klient** wypełnia formularz na `index.html` (1 duże pole + 4 quicki + kontakt).
2. **Po submit** uruchamia się `AIAnalysis.analyze()` — heurystyczna pre-analiza:
   - Wyszukuje słowa-klucze w opisie (CRM, sprzedaż, magazyn, faktury, support…)
   - Identyfikuje 1-4 obszary do automatyzacji
   - Szacuje godziny i cenę (skalowane przez wielkość zespołu)
   - Generuje czerwone i zielone flagi
   - Wylicza fit score
3. **Lead** zapisuje się w localStorage z unikalnym `id` (dla Ciebie) i `token` (dla klienta).
4. **Klient** wraca na `dziekuje.html` z linkiem do `klient/?token=...` gdzie widzi status i timeline.
5. **Ty** wchodzisz na `panel/` — widzisz inbox, klikasz w lead, zmieniasz status, dodajesz notatki, oglądasz metryki.

## Statusy lead'a

- `new` — świeży, jeszcze nie tknięty
- `analyzing` — czytasz, mapujesz procesy
- `proposal_sent` — wycena poszła do klienta
- `won` — startujemy projekt
- `lost` — nie współpracujemy

## Demo mode

W `panel/index.html` masz przycisk **„+ Wgraj demo (5 leadów)"** — załaduje 5 realistycznych briefów (różne branże, statusy, zespoły) żebyś zobaczył jak to wygląda przy pełnej tablicy.

## Stack (obecny — MVP)

- **HTML / CSS / vanilla JS** — bez frameworków
- **localStorage** — przechowywanie leadów (modularny `Leads` API, łatwo wymienić)
- **Mock AI** — heurystyki w `ai-analysis.js`, nie wymaga API key
- **Google Fonts** — Inter + Instrument Serif (oba wspierają PL)

## Co podpiąć przed produkcją (jeśli zdecydujesz iść dalej)

### 1. Backend (Supabase albo własny)
Zamień `assets/api.js` na klienta Supabase. Już ma identyczne API:

```sql
CREATE TABLE consult_leads (
    id text PRIMARY KEY,
    token text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'new',
    problem text,
    industry text,
    team_size text,
    payroll text,
    budget text,
    contact_name text,
    company text,
    contact_email text,
    contact_phone text,
    ai_analysis jsonb,
    notes jsonb DEFAULT '[]'
);
```

RLS policy: anon może `INSERT` (formularz) i `SELECT WHERE token = ?` (klient view). Pełny `SELECT/UPDATE/DELETE` tylko dla service role (panel — z basic auth lub Supabase Auth).

### 2. Realny AI (Claude API)
Zamień `ai-analysis.js` → wywołanie edge function `analyze-brief` która wyśle problem klienta do Claude'a z dobrym promptem. Heurystyki zostaw jako fallback / pre-filter.

### 3. Email
Po submit briefa wyślij:
- mail do klienta („mam to, czytam, odzywam się do 48h" + link do `klient/?token=...`)
- mail do Ciebie z podsumowaniem + linkiem do `panel/lead.html?id=...`

Najprościej: Resend / Postmark / własna edge function.

### 4. Auth dla panelu
`panel/*` musi wymagać logowania. Najprostszy wariant: Supabase Auth, jedno konto (Twoje). Inaczej każdy z linkiem dostaje pełen pipeline.

### 5. Domena
Sub-domena typu `briefy.tomekniedzwiecki.pl` albo własna jak `zwolnieetaty.pl`. Vercel z `vercel.json` na rewrites — łatwe.

## Co warto dopracować (jeśli idziemy dalej)

- [ ] Walidacja formularza po stronie klienta (lepsza UX errorów)
- [ ] Filtr / search po inboxie
- [ ] Export leadów do CSV
- [ ] Email reminder dla leadów w `new` > 24h
- [ ] Soft delete + archive
- [ ] Tagi (np. „pilne", „mały budżet", „follow up")
- [ ] Calendly / Cal.com embed w `dziekuje.html` żeby od razu rezerwowali call
- [ ] Plausible / Umami analytics

## Linki lokalne

- Landing: [index.html](index.html)
- Panel: [panel/index.html](panel/index.html)
- Dashboard: [panel/dashboard.html](panel/dashboard.html)
- Klient view (demo): wypełnij formularz → dostaniesz link
