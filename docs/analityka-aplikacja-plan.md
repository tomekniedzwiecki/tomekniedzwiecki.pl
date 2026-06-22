# Plan pełnej analityki — lejek „Aplikacja / Stworzę" (persona `stworze`)

> Wzorzec: to, co Cowork zrobił dla `/zbuduje` 2026-06-09 (GA4 `form_complete` + `purchase`, 13+3 custom dimensions, import do Google Ads). Master-doc: pamięć `project-google-ads-conversion-attribution-gaps`.
> Podział pracy: **KOD** (eventy w stronie) = Claude Code / Tomek · **KONFIG** (GA4 + Google Ads) = Claude Cowork (brief na końcu).

## ID (stałe)
- GA4 `G-W8CLDSHVFC` (property `521517351`)
- Google Ads tag `AW-17886093904` / konto **705-029-9031**
- Meta pixel `1668188210820080` · TikTok `D6AP4E3C77U3L7SP8O7G`
- Oferty: rezerwacja **500 zł** `a1656695-db0d-4ae7-b107-230832042076`; kolejna rozmowa **49 zł** `2a1fbbfe-32fe-4aa3-9f96-3a812da103d4`
- Checkout: `https://crm.tomekniedzwiecki.pl/checkout/v2/?offer=<id>&lead=<lead_id>` (ten sam pipeline co `/zbuduje`: tpay/revolut → `success.html` + webhooki → GA4 `purchase`)

---

## 1. Stan obecny (po audycie 2026-06-15)

| Strona | GA4 | Ads | Meta | TikTok | Consent | Capture | Eventy konwersji |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| `/aplikacja` | ✓ | ✓ | ✓ | ✓ | ✓ | (app-side) | `scene_view`, `cta_click` |
| `/aplikacja/sparing` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (head + app `LS_TRACKING`) | **`generate_lead` (bramka kontaktu)** + Meta `Lead`/TikTok `SubmitForm` + CAPI |
| `/aplikacja/wspolpraca` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `/aplikacja/inspiracje` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `inspiracje_cta_click` |

**Wniosek:** piksele i lead są podpięte. **Panel sparingu (taby/artefakty/rezerwacja) jest praktycznie nieoinstrumentowany** — to główna luka. Rezerwacja `purchase` powstaje na CRM checkout (wymaga WERYFIKACJI, że oferta `a1656695` odpala `purchase` z `persona=stworze`).

---

## 2. Mapa lejka → eventy

```
/aplikacja (landing)
   │  scene_view, cta_click
   ▼
sparing: pierwsza wiadomość ........ app_chat_start
   │  definicja pomysłu ............. app_idea_defined {niche}
   │  bramka potencjału → werdykt ... app_verdict {verdict, ocena}
   │  bramka kontaktu (mail+tel) .... generate_lead ✓ (KEY)
   ▼
PANEL (po zielonym):
   │  otwarcie panelu ............... app_panel_open
   │  wejście w zakładkę ............ app_tab_view {tab}
   │  artefakt gotowy ............... app_artifact_ready {artifact}
   │  podgląd makiety (lightbox) .... app_preview_view {view}
   ▼
   │  klik „Rezerwuję 500 zł" ....... app_reservation_cta {location} + begin_checkout (500)
   ▼  (CRM checkout/v2 → tpay)
   │  rezerwacja opłacona ........... purchase + app_reservation (500) (KEY)  ← na success.html CRM
   └  dokup rozmowy 49 zł (BLIK) .... app_convo_purchase (49) (opcjonalnie)
```

---

## 3. Taksonomia eventów (KOD — co strona ma wysyłać)

Legenda: ✓ = już jest · ➕ = do dodania. Wszystkie z `persona:'stworze'`.

### Landing `/aplikacja` (jest)
- ✓ `scene_view` {scene_index, persona}
- ✓ `cta_click` {cta_location, destination:'sparing', persona, has_idea}

### Sparing — rozmowa (➕ kod we froncie sparingu)
| Event | Trigger | Parametry | Piksel |
|---|---|---|---|
| ➕ `app_chat_start` | pierwsza wiadomość usera | persona | GA4 (+Meta `Contact` opc.) |
| ➕ `app_idea_defined` | pierwszy `<projekt>`/brief sparsowany | persona, niche | GA4 |
| ➕ `app_verdict` | event `spar_meta` z werdyktem | persona, **verdict** (zielony/zolty/bierny), **ocena** (mocny/do_poprawy/slaby jeśli dostępne) | GA4 |
| ✓ `generate_lead` | bramka kontaktu (mail+tel) | persona, method:'contact_gate' | GA4 + Meta `Lead` + TikTok `SubmitForm` + **CAPI** (dedup `event_id=lead_<sessionId>`) |

### Sparing — panel (➕)
| Event | Trigger | Parametry |
|---|---|---|
| ➕ `app_panel_open` | pierwsze otwarcie panelu po zielonym | persona |
| ➕ `app_tab_view` | `switchTab`/wejście w zakładkę | persona, **tab** (ekrany/karta/plan/rynek/economics/gtm/reklamy/strona/prototyp/wspolpraca) |
| ➕ `app_artifact_ready` | artefakt skończył się generować | persona, **artifact** (plan/raport/economics/gtm/landing/prototype) |
| ➕ `app_preview_view` | otwarcie makiety w lightboxie | persona, **view** |

### Rezerwacja / konwersja (➕ front + CRM)
| Event | Trigger | Parametry | Piksel |
|---|---|---|---|
| ➕ `app_reservation_cta` | klik „Rezerwuję rozmowę → 500 zł" (Współpraca + karta `<makieta>`) | persona, location (wspolpraca/makieta_card) | GA4 + Meta `InitiateCheckout` + TikTok `InitiateCheckout` |
| ➕ `begin_checkout` | jw. (GA4 ecommerce) | value:500, currency:'PLN', items:[{item_id:'reservation_app'}] | GA4 |
| ➕ `app_reservation` + `purchase` | rezerwacja OPŁACONA — na `success.html` CRM gdy `offer=a1656695` | value:500, currency:'PLN', transaction_id, persona:'stworze' | GA4 + Meta `Purchase` + TikTok `CompletePayment` (CAPI w webhookach) |
| ➕ `app_convo_purchase` | dokup rozmowy 49 zł (BLIK potwierdzony) | value:49, currency:'PLN' | GA4 (opcjonalnie) |

> **WERYFIKACJA (krytyczna):** potwierdzić, że checkout `a1656695` przechodzi przez `orders` + `tpay/revolut-webhook` i odpala GA4 `purchase`. Jeśli tak — dołożyć rozróżnienie funnela: na `success.html` przy `offer=a1656695` ustawić `persona:'stworze'` i wysłać dodatkowy event `app_reservation` (czysta konwersja w Ads bez mieszania z `/zbuduje`).

---

## 4. Konwersje (KEY EVENTS) i import do Google Ads

Ponieważ GA4 jest **wspólne** dla `/zbuduje` (persona `build`) i `/aplikacja` (persona `stworze`), konwersje Stworzę trzymamy na **osobnych nazwach eventów**, żeby akcje w Ads się nie mieszały:

| Cel | Event GA4 | Akcja Google Ads | Rola |
|---|---|---|---|
| Lead (kontakt) | `generate_lead` (persona=stworze) | „Aplikacja — Lead" | pomocnicza/obserwacja LUB miękki primary |
| **Rezerwacja 500 zł** | **`app_reservation`** | „Aplikacja — Rezerwacja" (value 500) | **PRIMARY** (główny cel biddingu) |
| Pomysł zakwalifikowany | `app_verdict` (verdict=zielony) | „Aplikacja — Zielony pomysł" | obserwacja (NIE primary — nie psuć biddingu) |

> `generate_lead` jest też mikro-eventem na `/zapisy` (build). Dlatego do Ads importujemy go z **filtrem `persona=stworze`** albo dajemy leadowi Stworzę osobną nazwę `app_lead` (rekomendacja: dodać `app_lead` obok `generate_lead`, żeby Ads miało czysty kubełek).

---

## 5. Custom dimensions (GA4 — do rejestracji przez Cowork)

**Event-scoped:** `verdict`, `ocena`, `niche`, `tab`, `artifact`, `view`, `cta_location`, `location`, `method`, `has_idea`, `destination`, `scene_index`
**User-scoped:** `persona` (już używane; potwierdzić rejestrację)

(Reużywamy wymiarów `/zbuduje` tam, gdzie się pokrywają — `persona`, `cta_location`, `method` już istnieją; dorejestrować brakujące: `verdict`, `ocena`, `niche`, `tab`, `artifact`, `view`.)

## 6. Model wartości (value-based)
- `app_reservation` = **500 zł** (realna intencja; zwrotne, ale to najsilniejszy sygnał).
- `generate_lead`/`app_lead` = proxy LTV (np. 80–120 zł; do kalibracji jak na `/zapisy` `computeLeadValue`). Opcjonalnie podbić, gdy `verdict=zielony`.
- Cel: kampania optymalizuje pod **wartość** `app_reservation`, nie liczbę leadów.

## 7. Audiencje / remarketing (GA4 → Ads/Meta)
- **A1** — byli na `/aplikacja`, brak `app_chat_start` (dokończ wejście)
- **A2** — `app_chat_start`, brak `generate_lead` (dokończ rozmowę)
- **A3** — `generate_lead`, brak `app_reservation` (zarezerwuj) — ciepłe
- **A4** — `app_verdict`=zielony, brak `app_reservation` — **gorące**
- **A5** — `app_reservation` (wyklucz z akwizycji + seed lookalike/similar)

## 8. Server-side / CAPI
- Lead: browser + Meta CAPI + TikTok Events API (**ZROBIONE** — dedup `event_id=lead_<sessionId>`).
- Rezerwacja `purchase`: idzie przez webhooki CRM (`tpay/revolut-webhook` → GA4 MP + Meta/TikTok CAPI) — potwierdzić, że oferta `a1656695` je wyzwala i niesie `persona=stworze`.
- Cross-domain: linker `tomekniedzwiecki.pl ↔ crm.tomekniedzwiecki.pl` (ustawione w bloku trackingu sparingu).

---

## 9. ZADANIE DLA CLAUDE COWORK (konfiguracja GA4 + Google Ads)

> Wkleić do Claude Cowork. Część kodowa (wysyłka eventów) jest/będzie zrobiona po stronie strony — Cowork zajmuje się WYŁĄCZNIE konfiguracją GA4 + Google Ads.

**Gotowy do wklejenia brief = osobny plik [`cowork-zadanie-aplikacja.md`](cowork-zadanie-aplikacja.md).** Do Cowork wklej TYLKO tamten plik (od „KONTEKST" do końca), NIE ten plan.

---

## 10. Zmiany z re-review 2026-06-15 (as-built)

Naprawione od ręki (bo „tanio teraz"):
1. **Atrybucja leada** (`sparing` `captureTracking`): scala click-ID z bloku `<head>` (sessionStorage `tracking_params`) + pełny zestaw `lead_tracking` (gbraid/wbraid/gad_source/utm_id/campaignid…). Wcześniej wejście przez `/aplikacja` gubiło gclid → lead „direct". Commit `tomekniedzwiecki.pl 1d3f2c4`.
2. **CAPI fbc fallback** (`metaCapi`): odtwarza `fbc` z `fbclid`, gdy brak cookie `_fbc` (iOS/blokery). `1d3f2c4`.
3. **Rozdzielenie konwersji purchase** (`tn-crm checkout/success.html`): `purchase` niesie `persona`; **`app_reservation` odpala się JUŻ z success.html** TYLKO dla rezerwacji 500 zł (nie dla dokupu 49 zł — wykryta i naprawiona kolizja opisu). Commit `tn-crm 2931be4`.

Wpływ na brief Cowork:
- Konwersja „Aplikacja — Rezerwacja" = import GA4 **`app_reservation`** (już wysyłany przez success.html). NIE trzeba kodu po stronie checkoutu.
- `purchase` jest teraz wspólny ALE z `persona` → konwersja „Zakup" lejka `/zbuduje` jest minimalnie kontaminowana rezerwacjami Stworzę. Cowork: albo zawęź „Zakup" do `persona=build` (GA4 utworzone zdarzenie / audience), albo zaakceptuj (mały wolumen Stworzę). Stworzę i tak liczymy przez `app_reservation`.

Otwarte (NIE naprawione — wymaga decyzji / dotyka wrażliwych miejsc):
- Webhooki płatności (`tpay/revolut-webhook`) NIE wysyłają server-side `app_reservation` — rezerwacja jako konwersja jest na razie browser-only (success.html). Dorobienie = odporność iOS, ale dotyka integracji TPay (ostrożnie).
- `tn-crm`: wdrożone edge functions (spar-chat/assess/economics/gtm/plan/raport) są **niezacommitowane** w gicie — runtime OK, ale repo nie odzwierciedla deployu (higiena).
- `/zwolnie` (lejek prezesi) = czarna skrzynka: ma piksele, ale ZERO eventów i ZERO capture → ruch z reklam tam gubi atrybucję. Osobny lejek, do zrobienia jeśli pójdą tam kampanie.
- GA4: filtr ruchu wewnętrznego (wizyty Tomka + testy) — config Cowork.
