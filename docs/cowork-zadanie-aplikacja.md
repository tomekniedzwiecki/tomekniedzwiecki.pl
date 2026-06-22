# ZADANIE DLA CLAUDE COWORK — analityka lejka „Aplikacja / Stworzę"

> Wklej CAŁĄ treść poniżej (od „KONTEKST" do końca) do Claude Cowork. To samodzielny brief — nie wymaga niczego więcej.

---

KONTEKST
Skonfiguruj analitykę dla NOWEGO lejka sprzedażowego „Aplikacja / Stworzę" na stronie tomekniedzwiecki.pl (user_property `persona = 'stworze'`). Działa on RÓWNOLEGLE do istniejącego lejka „/zbuduje" (`persona = 'build'`), na tej samej własności GA4. Rozróżniamy je po `persona`. Strona JUŻ wysyła wszystkie potrzebne piksele i eventy (część kodowa zrobiona) — Twoje zadanie to WYŁĄCZNIE konfiguracja po stronie GA4 + Google Ads. NIE dotykaj kodu strony ani konfiguracji lejka „/zbuduje".

KONTA / ID
- GA4: `G-W8CLDSHVFC` (property numeryczne `521517351`)
- Google Ads: tag `AW-17886093904`, konto `705-029-9031` (Tomek Niedźwiecki)
- (piksele Meta `1668188210820080` i TikTok `D6AP4E3C77U3L7SP8O7G` — już zbierają eventy lead/rezerwacja przez CAPI; nimi nie musisz się zajmować, chyba że robisz audiencje remarketingowe)

EVENTY GA4, KTÓRE STRONA JUŻ WYSYŁA (wszystkie z parametrem `persona='stworze'`)
Lejek wejścia:
- `scene_view` {scene_index} — scroll landingu /aplikacja
- `cta_click` {cta_location, destination} — klik CTA do sparingu
Rozmowa (sparing):
- `app_chat_start` {entry} — pierwsza wiadomość użytkownika
- `app_idea_defined` {niche} — użytkownik zdefiniował pomysł
- `app_verdict` {verdict, ocena} — werdykt bramki potencjału (verdict = zielony|zolty|bierny; ocena = mocny|do_poprawy|slaby)
- `app_lead` {method:'contact_gate'} — podał e-mail + telefon (KONWERSJA: lead lejka Stworzę)
- `generate_lead` {method:'contact_gate'} — TEN SAM moment, ale event WSPÓLNY z /zapisy (tam celowo mikro „nie key event"). NIE oznaczaj go jako key event — od tego jest `app_lead`.
Panel:
- `app_tab_view` {tab} — wejście w zakładkę (ekrany|karta|plan|rynek|economics|gtm|reklamy|strona|prototyp|wspolpraca)
- `app_preview_view` {view} — otwarcie makiety w podglądzie
Rezerwacja / zakup:
- `app_reservation_cta` {location} — klik „Rezerwuję rozmowę → 500 zł" (intencja, Stworzę-only). Standardowy `begin_checkout` i Meta `InitiateCheckout` odpala już strona checkout/v2 (wspólne z /zbuduje, NIE konwersja Stworzę).
- `app_reservation` {value:500, currency:'PLN', transaction_id} — REZERWACJA OPŁACONA (KONWERSJA: zakup) — wysyłana z success.html tylko dla rezerwacji 500 zł
- `purchase` {value, currency:'PLN', persona, transaction_id} — wspólny event ecommerce (zawiera teraz `persona`; dla lejka Stworzę liczymy przez `app_reservation`, nie przez `purchase`)

ZADANIA

1) GA4 — Custom definitions (Admin → Custom definitions). Zarejestruj brakujące wymiary, NIE duplikuj istniejących z lejka /zbuduje:
   - Event-scoped: `verdict`, `ocena`, `niche`, `tab`, `view`, `location`, `entry`
   - Potwierdź, że istnieją (z /zbuduje): `persona` (user-scoped), `cta_location`, `method`, `scene_index`, `destination`
   (Uwaga: GA4 zbiera wymiar dopiero OD MOMENTU rejestracji — nie wstecz. Zarejestruj je teraz.)

2) GA4 — Zdarzenia kluczowe (Admin → Key events). Oznacz jako key event:
   - `app_reservation` (główna konwersja lejka Stworzę)
   - `app_lead` (lead lejka Stworzę)
   - `app_verdict` (do obserwacji jakości pomysłów)
   NIE oznaczaj `generate_lead` jako key event — jest WSPÓLNY z /zapisy (tam celowo mikro). `purchase` jest już key eventem (wspólny) — zostaw.

3) Google Ads — akcje konwersji (import z GA4):
   - „Aplikacja — Rezerwacja" = import GA4 `app_reservation`; wartość z eventu (500 zł); kategoria „Zakup"; rola GŁÓWNE działanie (primary), uwzględniona w konwersjach. To główny cel biddingu lejka Stworzę.
   - „Aplikacja — Lead" = import GA4 `app_lead` (event WYŁĄCZNIE lejka Stworzę — żaden filtr persona nie jest potrzebny, bo /zapisy go nie wysyła); kategoria „Potencjalny klient"; rola POMOCNICZA (secondary/observation — nie psuć biddingu na rezerwację).
   - „Aplikacja — Zielony pomysł" = import GA4 `app_verdict` zawężony do `verdict=zielony`; rola OBSERWACJA.
   - NIE importuj wspólnego `purchase` jako osobnej akcji dla tego lejka (uniknięcie double-count z /zbuduje) — Stworzę liczymy przez `app_reservation`.

4) Google Ads — higiena istniejącego lejka /zbuduje:
   - Wspólny `purchase` zawiera teraz `persona`. Rezerwacje Stworzę 500 zł też odpalają `purchase`, więc mogą minimalnie kontaminować konwersję „Zakup" lejka /zbuduje. Jeśli ta akcja importuje `purchase` bezpośrednio — zawęź ją do `persona=build` (przez utworzone zdarzenie GA4 lub regułę), albo zaakceptuj (wolumen Stworzę jest mały). Decyzja Twoja; udokumentuj wybór.

5) Value-based: gdy powstanie kampania lejka Stworzę, ustaw optymalizację pod WARTOŚĆ akcji „Aplikacja — Rezerwacja" (nie liczbę leadów).

6) Audiencje remarketingowe (GA4 → Admin → Audiences; połącz z Google Ads, opcjonalnie Meta):
   - „App — porzucił rozmowę": `app_chat_start` AND NOT `app_lead`
   - „App — lead bez rezerwacji": `app_lead` AND NOT `app_reservation`
   - „App — gorący (zielony bez rezerwacji)": `app_verdict`(verdict=zielony) AND NOT `app_reservation`
   - „App — zarezerwował": `app_reservation` (do wykluczeń + seed similar/lookalike)

7) Walidacja: po 24–48 h ruchu sprawdź w GA4 (Realtime + DebugView), że eventy spływają z wymiarami (`verdict`, `tab`, `ocena`), oraz w Google Ads, że akcje „Aplikacja — *" zbierają konwersje, a `persona` poprawnie rozdziela oba lejki w raportach.

CZEGO NIE ROBIĆ
- Nie zmieniaj kodu strony.
- Nie ruszaj konfiguracji lejka /zbuduje (persona build) poza ewentualnym zawężeniem `purchase` do persona=build (pkt 4).
- Nie importuj wspólnego `purchase` po raz drugi jako konwersji Stworzę.
