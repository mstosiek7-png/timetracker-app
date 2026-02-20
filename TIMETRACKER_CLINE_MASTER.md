# TimeTracker — Kompletna Dokumentacja dla Cline AI
> **asphaltbau** · React Native + Expo + TypeScript + Supabase
> Repo: `mstosiek7-png/timetracker-mobile`

---

## Jak używać tego dokumentu

1. Wrzuć folder `docs/` do katalogu głównego repo
2. Wrzuć pliki `memory-bank/` do `.cline/memory-bank/`
3. Wrzuć plik `.clinerules` do katalogu głównego repo
4. Otwórz Cline w VSCode i powiedz: **"Przeczytaj .cline/memory-bank/ i zacznijmy od Etapu 1"**
5. Wklejaj prompty z tego pliku po kolei — jeden prompt = jedna sesja

---

## Stack techniczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | React Native + Expo (SDK 51) |
| Język | TypeScript (strict) |
| Backend | Supabase (PostgreSQL + Storage + Auth) |
| State | Zustand |
| Queries | React Query |
| UI Library | React Native Paper |
| Persystencja lokalna | AsyncStorage |
| Nawigacja | Expo Router (file-based) |
| Eksport | jsPDF + ExcelJS + expo-sharing |
| OCR | services/ocr.ts (istniejący) |

## Struktura repo (istniejąca)

```
timetracker-mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Dashboard
│   │   ├── monthly.tsx        # Widok miesięczny
│   │   └── scanner.tsx        # Skaner OCR
│   └── _layout.tsx
├── components/
├── constants/
├── services/
│   └── ocr.ts
├── types/
├── supabase/
└── .cline/
    └── memory-bank/
```

## Aktualni pracownicy w bazie
- Jacek Jakubik
- Michal Stosiek

---

## Design System — wartości docelowe

```typescript
// constants/theme.ts — DOCELOWY WYGLĄD
export const theme = {
  colors: {
    background:  '#F5F0E8',  // kremowe tło
    card:        '#FFFFFF',  // białe karty
    accent:      '#E8722A',  // pomarańczowy CTA
    accentLight: '#FFF0E6',
    dark:        '#1A1A1A',
    mid:         '#4A4A4A',
    muted:       '#9A9A9A',
    border:      '#E8E0D0',
    // statusy
    work:     { bg: '#E8F5EF', text: '#2E7D5E' },
    sick:     { bg: '#FDECEA', text: '#C0392B' },
    vacation: { bg: '#E8F4FF', text: '#1A6FA8' },
    fza:      { bg: '#FFF0E6', text: '#E8722A' },
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 28 },
  fontSize: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
}
```

### Zasady designu (OBOWIĄZKOWE)
- ✅ Flat design — **zero shadows, zero gradients**
- ✅ Kremowe tło `#F5F0E8` zamiast czarnego
- ✅ Białe karty `#FFFFFF` z border `#E8E0D0`
- ✅ Pomarańczowy accent `#E8722A` dla CTA i aktywnych elementów
- ✅ Lewy kolorowy pasek karty zamiast całego kolorowego tła
- ✅ Font systemowy — SF Pro (iOS) / Roboto (Android)
- ❌ Żadnych hardcoded wartości kolorów — tylko `theme.ts`
- ❌ Żadnych niebieskich akcentów (obecny styl do zastąpienia)

---

---

# ETAP 1 — Design System & Redesign ekranów

> **Czas:** 2–3 tygodnie
> **Cel:** Zastąpić obecny ciemny/niebieski design kremowo-pomarańczowym. Zbudować komponenty bazowe których używają wszystkie kolejne ekrany.

---

## Etap 1 · Checklist

- [ ] `constants/theme.ts` — tokeny kolorów, typografii, spacingu
- [ ] `components/ui/Card.tsx`
- [ ] `components/ui/StatusBadge.tsx`
- [ ] `components/ui/StatBox.tsx`
- [ ] `components/ui/FAB.tsx`
- [ ] `components/ui/PageHeader.tsx`
- [ ] `components/ui/SectionTitle.tsx`
- [ ] `components/ui/EmptyState.tsx`
- [ ] Redesign `app/(tabs)/index.tsx` (Dashboard)
- [ ] Redesign `app/(tabs)/monthly.tsx` (Widok miesięczny)
- [ ] Redesign `app/(tabs)/scanner.tsx` (Skaner)
- [ ] Bottom navigation — nowe kolory i ikony

---

## Etap 1 · Memory Bank

Po zakończeniu każdej sesji Cline aktualizuje `.cline/memory-bank/activeContext.md` i `progress.md`.

### Wzorzec activeContext.md po sesji Etapu 1:
```markdown
# Active Context

## Aktualnie pracuję nad:
Etap 1 — Design System

## Ostatnio ukończone:
- ✅ constants/theme.ts
- ✅ Card.tsx, StatusBadge.tsx, StatBox.tsx

## Następne zadanie:
FAB.tsx, PageHeader.tsx, SectionTitle.tsx, EmptyState.tsx

## Otwarte kwestie:
- Sprawdzić czy React Native Paper nie nadpisuje fontów
```

---

## Etap 1 · Znane błędy i rozwiązania

| Problem | Rozwiązanie |
|---------|-------------|
| React Native Paper nadpisuje kolory | Użyj `PaperProvider` z własnym theme opartym na `theme.ts` |
| Separator dziesiętny na Android (przecinek) | `value.replace(',', '.')` przed `parseFloat()` |
| `StyleSheet.create` nie przyjmuje zmiennych | Użyj `style={[styles.base, { color: theme.colors.accent }]}` |
| Expo Router tabs — zmiana ikony | Edytuj `app/(tabs)/_layout.tsx` |

---

## Etap 1 · Prompt A — Design System

> Wklej do Cline jako pierwszy prompt Etapu 1

```
Zacznij od przeczytania .cline/memory-bank/ jeśli istnieje.

ZADANIE: Utwórz kompletny design system dla aplikacji TimeTracker.

## 1. constants/theme.ts

Utwórz plik z następującymi tokenami:

colors:
  background:  '#F5F0E8'
  card:        '#FFFFFF'
  accent:      '#E8722A'
  accentLight: '#FFF0E6'
  dark:        '#1A1A1A'
  mid:         '#4A4A4A'
  muted:       '#9A9A9A'
  border:      '#E8E0D0'
  statusColors:
    work:     { bg: '#E8F5EF', text: '#2E7D5E' }
    sick:     { bg: '#FDECEA', text: '#C0392B' }
    vacation: { bg: '#E8F4FF', text: '#1A6FA8' }
    fza:      { bg: '#FFF0E6', text: '#E8722A' }

radius:   { sm: 8, md: 12, lg: 16, xl: 20, pill: 28 }
fontSize: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 }
spacing:  { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 }

## 2. components/ui/Card.tsx
Props: children, leftBorderColor?: string, style?: ViewStyle
- Tło: theme.colors.card (#FFFFFF)
- Border: 1px solid theme.colors.border
- BorderRadius: theme.radius.lg (16)
- Padding: theme.spacing.lg (16)
- Jeśli leftBorderColor: lewy pasek 4px w tym kolorze
- Zero shadows, zero elevation

## 3. components/ui/StatusBadge.tsx
Props: status: 'work' | 'sick' | 'vacation' | 'fza', size?: 'sm' | 'md'
- Tło i kolor tekstu z theme.colors.statusColors[status]
- BorderRadius: theme.radius.pill
- Tekst uppercase, fontWeight 700
- sm: fontSize 10, padding 4/10
- md: fontSize 12, padding 6/14

## 4. components/ui/StatBox.tsx
Props: value: string, label: string, color?: string
- Brak tła (transparentne)
- value: fontSize xl (20), fontWeight 900, color: color ?? theme.colors.accent
- label: fontSize xs (10), color: theme.colors.muted, uppercase

## 5. components/ui/FAB.tsx
Props: label?: string, onPress: () => void, icon: string
- Tło: theme.colors.accent (#E8722A)
- Tekst i ikona: białe
- BorderRadius: theme.radius.pill
- Padding: 14/24
- fontSize: theme.fontSize.md, fontWeight 700

## 6. components/ui/PageHeader.tsx
Props: title: string, subtitle?: string, rightAction?: ReactNode
- Tło: theme.colors.card
- title: fontSize xxl (24), fontWeight 900, color: theme.colors.dark
- subtitle: fontSize sm (12), color: theme.colors.muted
- Border bottom: 1px solid theme.colors.border
- Padding: 12/16

## 7. components/ui/SectionTitle.tsx
Props: text: string, rightText?: string, onRightPress?: () => void
- text: fontSize sm (12), fontWeight 700, color: theme.colors.muted, UPPERCASE
- rightText: fontSize sm (12), color: theme.colors.accent
- Margin bottom: theme.spacing.sm

## 8. components/ui/EmptyState.tsx
Props: icon: string, title: string, subtitle?: string
- Wyśrodkowane, padding 32
- icon: fontSize 32
- title: fontSize lg, fontWeight 700, color: theme.colors.mid
- subtitle: fontSize sm, color: theme.colors.muted

ZASADY OBOWIĄZKOWE:
- Zero hardcoded kolorów — tylko theme.ts
- Zero shadows, zero gradients, zero elevation
- Flat design
- TypeScript strict — wszystkie props z typami

Po zakończeniu zaktualizuj .cline/memory-bank/activeContext.md i progress.md.
```

---

## Etap 1 · Prompt B — Redesign Dashboard

> Wklej po ukończeniu Promptu A

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Przeprojektuj app/(tabs)/index.tsx (Dashboard).

Zachowaj całą istniejącą logikę biznesową i połączenia z Supabase.
Zmień TYLKO warstwę UI.

NOWY UKŁAD (od góry):

1. PageHeader (components/ui/PageHeader.tsx):
   - subtitle: "asphaltbau"
   - title: "TimeTracker"
   - rightAction: dzisiejsza data (fontSize sm, color muted)

2. Rząd 3 StatBoxów (components/ui/StatBox.tsx) w Card:
   - Pracownicy / Aktywni
   - Wpisy / Ostatnie 30 dni
   - Godziny / Łącznie

3. Rząd kafelków statusów (4 szt.) w Card:
   - PRACA / CHOROBOWE / URLOPY / FZA
   - Każdy kafelek: StatusBadge + wartość godzin obok
   - Układ: 3 w pierwszym rzędzie + 1 w drugim

4. Card "Szybkie akcje":
   - SectionTitle "SZYBKIE AKCJE"
   - Dwa przyciski FAB obok siebie:
     "+ Dodaj wpis" (tło accent #E8722A)
     "Zbiorczo" (tło dark #1A1A1A)

5. Card "Ostatnie wpisy":
   - SectionTitle "OSTATNIE WPISY" + rightText "Zobacz wszystkie"
   - Lista kart pracowników z Card.tsx + leftBorderColor = kolor statusu
   - EmptyState jeśli brak wpisów

6. Card "Aktywni pracownicy":
   - SectionTitle "AKTYWNI PRACOWNICY"
   - Małe pilsy z inicjałem + imieniem

7. Card "Zarządzanie pracownikami":
   - SectionTitle "PRACOWNICY" + rightText "Zobacz wszystkich"
   - Lista 2 kart: imię (bold), nazwisko (muted), StatusBadge "Aktywny"

GLOBALNE:
- Tło ekranu: theme.colors.background (#F5F0E8)
- Wszystkie kolory z theme.ts
- ScrollView z padding 16
- Gap między kartami: 12px

Po zakończeniu zaktualizuj memory bank.
```

---

## Etap 1 · Prompt C — Redesign Widok Miesięczny + Skaner

> Wklej po ukończeniu Promptu B

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Przeprojektuj app/(tabs)/monthly.tsx i app/(tabs)/scanner.tsx.
Zachowaj całą logikę — zmień tylko UI.

=== monthly.tsx ===

NOWY UKŁAD:

1. PageHeader: subtitle "asphaltbau", title "Widok Miesięczny"

2. Card "Pracownik":
   - SectionTitle "PRACOWNIK"
   - Imię (bold, xl), Nazwisko (muted, sm)
   - StatusBadge "Aktywny" (work)
   - Przycisk zmiany pracownika — pill button, tło accentLight, tekst accent

3. Card "Nawigacja miesiąca":
   - Strzałka wstecz / Nazwa miesiąca (bold, xl) / Strzałka naprzód
   - Toggle Kalendarz | Podsumowanie (aktywny: tło dark, tekst white)

4. Card "Podsumowanie miesiąca":
   - SectionTitle "PODSUMOWANIE MIESIĄCA"
   - Rząd 3 StatBoxów: Łącznie godzin / Dni z wpisami / Średnia/dzień
   - Lista statusów: StatusBadge + wartość godzin po prawej

=== scanner.tsx ===

NOWY UKŁAD:
1. PageHeader: title "Skaner OCR"
2. Obszar aparatu — zachowaj istniejący komponent kamery
3. Przycisk "Skanuj" — FAB pełna szerokość, accent
4. Wyniki OCR w Card z kremowym tłem

=== Bottom Navigation ===
Zaktualizuj app/(tabs)/_layout.tsx:
- Tło: theme.colors.card (#FFFFFF)
- Border top: theme.colors.border
- Aktywny kolor: theme.colors.accent (#E8722A)
- Nieaktywny: theme.colors.muted
- Ikony z @expo/vector-icons

Po zakończeniu zaktualizuj memory bank.
```

---

---

# ETAP 2 — Kalkulator Asfaltu

> **Czas:** 3–5 dni
> **Cel:** Nowa zakładka z kalkulatorem do przeliczania tonażu asfaltu.
> **Mockup:** `docs/mockups/kalkulator-mockup.html`

---

## Etap 2 · Checklist

- [ ] `app/(tabs)/calculator.tsx` — ekran kalkulatora
- [ ] Zakładka "Kalkulator" w bottom navigation (4. pozycja)
- [ ] Persystencja gęstości przez AsyncStorage
- [ ] Test na Android — separator dziesiętny
- [ ] Test na iOS

---

## Etap 2 · Memory Bank

### Wzorzec activeContext.md po sesji Etapu 2:
```markdown
# Active Context

## Aktualnie pracuję nad:
Etap 2 — Kalkulator Asfaltu

## Ostatnio ukończone:
- ✅ Etap 1 — Design System + Redesign ekranów
- ✅ calculator.tsx — struktura i UI

## Następne zadanie:
Test separatora dziesiętnego na Android

## Otwarte kwestie:
- Sprawdzić AsyncStorage — czy klucz @calculator_density działa po restarcie
```

---

## Etap 2 · Znane błędy i rozwiązania

| Problem | Rozwiązanie |
|---------|-------------|
| Android używa przecinka jako separatora | `input.replace(',', '.')` przed `parseFloat()` |
| AsyncStorage zwraca null przy pierwszym uruchomieniu | Fallback: `const density = stored ? parseFloat(stored) : 2.40` |
| Klawiatura zasłania pola input | Owiń w `KeyboardAvoidingView` z `behavior="padding"` |
| Pole "własny %" nie chowa klawiatury po zatwierdzeniu | Dodaj `returnKeyType="done"` i `onSubmitEditing={Keyboard.dismiss}` |

---

## Etap 2 · Prompt — Kalkulator Asfaltu

> Wklej jako pierwszy i jedyny prompt Etapu 2

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Utwórz ekran kalkulatora asfaltu.

Wzorzec wizualny: docs/mockups/kalkulator-mockup.html
Odwzoruj ten plik 1:1 — kolory, układ, typografia, zachowanie.
Otwórz plik HTML i przeanalizuj go dokładnie zanim zaczniesz kodować.

LOGIKA:
Formuła: powierzchnia (m²) × grubość (cm) × gęstość (t/m³) ÷ 100 = tony
Gęstość domyślna: 2.40 t/m³
Persystencja: AsyncStorage, klucz '@calculator_density'
Dokładność: 3 miejsca po przecinku

PLIK: app/(tabs)/calculator.tsx

UKŁAD EKRANU (od góry):

1. PageHeader — subtitle "asphaltbau", title "Kalkulator"

2. Card "Gęstość materiału":
   - Lewa strona: label "Gęstość"
   - Prawa strona: wartość (duży, pomarańczowy, bold) + "t/m³"
   - Przycisk "Zmień gęstość" — rozwijany inline
   - Pole edycji + przycisk "Zapisz"
   - Po zapisaniu: AsyncStorage.setItem + przelicz

3. Dwa pola input (każde w osobnej Card):
   - Label górny (uppercase, muted) + jednostka (muted)
   - Duże pole numeryczne (fontSize 24, bold)
   - Pole 1: "POWIERZCHNIA" [m²]
   - Pole 2: "GRUBOŚĆ WARSTWY" [cm]
   - keyboardType="decimal-pad"
   - Każda zmiana → natychmiastowe przeliczenie

4. Pasek formuły (tło #1A1A1A, borderRadius 14):
   WARTOŚĆ m² × WARTOŚĆ cm × GĘSTOŚĆ t/m³ ÷ 100 = WYNIK t
   - Liczby i wynik: kolor accent (#E8722A)
   - Operatory: kolor muted rgba(255,255,255,0.4)

5. Wynik bazowy (tło #E8722A, pełna szerokość, borderRadius 16):
   - Label "WYNIK BAZOWY" uppercase, kolor rgba(255,255,255,0.7)
   - Liczba: fontSize 42, fontWeight 900, kolor white
   - Jednostka "t": fontSize 18, kolor rgba(255,255,255,0.8)

6. Card "Naddatek" — radio behavior (tylko jeden aktywny naraz):
   Każda opcja: wiersz z checkbox + label + wynik po prawej
   - Checkbox aktywny: tło #E8722A, biały ptaszek
   - Checkbox nieaktywny: border #E8E0D0, puste
   - Opcja 1: "+ 5%"  → po prawej "+X.XXX t"
   - Opcja 2: "+ 10%" → po prawej "+X.XXX t"
   - Opcja 3: "Własny %" → rozwija input numeryczny + po prawej "+X.XXX t"
   - Zaznaczenie jednego odznacza pozostałe automatycznie

7. Card "Suma końcowa" (tło #1A1A1A, borderRadius 16):
   - Wiersz: "Wynik bazowy" (muted) → "X.XXX t" (muted)
   - Wiersz (tylko gdy naddatek aktywny): "+ X%" → "+X.XXX t"
   - Divider: rgba(255,255,255,0.1)
   - "RAZEM" (uppercase, muted) → duża liczba (fontSize 32, accent) + "t" (muted)
   - Tekst formuły pod spodem (muted, fontSize 12):
     "X.XXX t + X% (X.XXX t) = X.XXX t"

8. Przycisk "Wyczyść kalkulator":
   - Outline style: border #E8E0D0, tło transparentne
   - Tekst: color muted
   - Resetuje wszystkie pola i checkboxy

NAWIGACJA:
Dodaj zakładkę "Kalkulator" w app/(tabs)/_layout.tsx:
Pozycja 4: Dashboard / Miesięczny / Skaner / Kalkulator
Ikona: Ionicons "calculator-outline"

TECHNICZNE:
- Wszystkie kolory z theme.ts — zero hardcoded
- KeyboardAvoidingView z behavior="padding"
- ScrollView — cały ekran scrollowalny
- Na Android: input.replace(',', '.') przed parseFloat()
- returnKeyType="done" + Keyboard.dismiss na polach numerycznych
- TypeScript strict — wszystkie typy jawnie

Po zakończeniu zaktualizuj .cline/memory-bank/ — zapisz że Etap 2 ukończony.
```

---

---

# ETAP 3 — Moduł Baustellen

> **Czas:** 3–4 tygodnie
> **Cel:** Nowy moduł do zarządzania budowami asfaltu — lista budów, dostawy, OCR Lieferscheinów, eksport PDF.
> **Mockup:** `docs/mockups/baustellen-mockup.html`

---

## Etap 3 · Checklist

- [ ] Migracja Supabase — tabele `construction_sites`, `asphalt_types`, `deliveries`
- [ ] Funkcja PostgreSQL `get_site_summary()`
- [ ] Bucket Storage `delivery-photos`
- [ ] Typy TypeScript w `types/database.types.ts`
- [ ] Zakładka "Baustellen" w bottom navigation
- [ ] `app/(tabs)/baustellen.tsx` — lista budów
- [ ] Modal "Nowa budowa" z dynamiczną listą klas asfaltu
- [ ] `app/site/[id].tsx` — szczegóły budowy
- [ ] `app/delivery/new.tsx` — formularz dostawy + OCR
- [ ] Eksport PDF (jsPDF) + Excel (ExcelJS)
- [ ] expo-sharing share sheet

---

## Etap 3 · Memory Bank

### Wzorzec activeContext.md po sesji Etapu 3:
```markdown
# Active Context

## Aktualnie pracuję nad:
Etap 3 — Moduł Baustellen

## Ostatnio ukończone:
- ✅ Etap 1 — Design System
- ✅ Etap 2 — Kalkulator
- ✅ Migracja DB Baustellen
- ✅ Lista budów (baustellen.tsx)

## Następne zadanie:
app/site/[id].tsx — szczegóły budowy

## Otwarte kwestie:
- Sprawdzić czy get_site_summary() zwraca dane dla pustej budowy
- jsPDF — test na iOS (wymaga osobnej konfiguracji)
```

---

## Etap 3 · Znane błędy i rozwiązania

| Problem | Rozwiązanie |
|---------|-------------|
| jsPDF nie działa na React Native bez konfiguracji | Użyj `jspdf` z `react-native-blob-util` lub `expo-file-system` do zapisu |
| Supabase Storage upload wymaga mime type | `contentType: 'image/jpeg'` w opcjach upload |
| OCR zwraca przecinki zamiast kropek w liczbach | `ocrResult.replace(',', '.')` przed parseFloat |
| expo-sharing nie działa na Android bez READ_EXTERNAL_STORAGE | Dodaj permisje w `app.json` |
| Camera permission na iOS | Info.plist: NSCameraUsageDescription |
| `get_site_summary()` zwraca null dla budów bez dostaw | Użyj `COALESCE(SUM(tons), 0)` w funkcji SQL |

---

## Etap 3 · Prompt A — Baza danych

> Wklej jako pierwszy prompt Etapu 3

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Utwórz migrację bazy danych dla modułu Baustellen.

PLIK: supabase/migrations/[timestamp]_baustellen.sql

TABELE:

construction_sites:
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY
  name        text NOT NULL
  address     text
  status      text NOT NULL DEFAULT 'active'  -- 'active' | 'completed'
  created_at  timestamptz DEFAULT now()

asphalt_types:
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY
  site_id     uuid NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE
  name        text NOT NULL   -- np. "AC 11 D S", "SMA 11 S"
  created_at  timestamptz DEFAULT now()

deliveries:
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY
  site_id         uuid NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE
  asphalt_type_id uuid REFERENCES asphalt_types(id)
  tons            decimal(8,2) NOT NULL
  lieferschein_nr text
  supplier        text
  delivery_time   timestamptz DEFAULT now()
  photo_url       text
  created_at      timestamptz DEFAULT now()

FUNKCJA PostgreSQL:
CREATE OR REPLACE FUNCTION get_site_summary(p_site_id uuid)
RETURNS TABLE (
  asphalt_type_name text,
  delivery_count    bigint,
  total_tons        decimal
) AS $$
  SELECT
    at.name,
    COUNT(d.id),
    COALESCE(SUM(d.tons), 0)
  FROM asphalt_types at
  LEFT JOIN deliveries d ON d.asphalt_type_id = at.id
    AND d.site_id = p_site_id
  WHERE at.site_id = p_site_id
  GROUP BY at.id, at.name
  ORDER BY at.name;
$$ LANGUAGE sql STABLE;

RLS:
- construction_sites: authenticated users — SELECT, INSERT, UPDATE
- asphalt_types: authenticated users — SELECT, INSERT, DELETE
- deliveries: authenticated users — SELECT, INSERT, UPDATE, DELETE

STORAGE:
- Bucket: 'delivery-photos'
- Public read: true
- Max file size: 10MB
- Allowed mime types: image/jpeg, image/png, image/webp

TYPY TYPESCRIPT:
Wygeneruj lub zaktualizuj types/database.types.ts o nowe tabele.

Po zakończeniu zaktualizuj memory bank.
```

---

## Etap 3 · Prompt B — Lista budów

> Wklej po ukończeniu Promptu A

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Utwórz ekran listy budów i zakładkę w nawigacji.

Wzorzec wizualny: docs/mockups/baustellen-mockup.html — ekran "Lista budów"
Odwzoruj 1:1.

=== NAWIGACJA ===
Dodaj zakładkę "Baustellen" w app/(tabs)/_layout.tsx:
Pozycja: między Skanereem a Kalkulatorem
Ikona: Ionicons "map-pin" lub "construct-outline"
Docelowy układ: Dashboard / Miesięczny / Baustellen / Kalkulator / Skaner

=== PLIK: app/(tabs)/baustellen.tsx ===

UKŁAD:

1. PageHeader:
   - subtitle: "asphaltbau"
   - title: "Baustellen"
   - rightAction: przycisk "+" (FAB mały, accent)

2. Rząd 3 StatBoxów w Card:
   - Aktywne budowy / count
   - Łącznie ton / suma decimal
   - Łącznie dostaw / count

3. Lista kart budów (Card.tsx):
   - leftBorderColor: accent (#E8722A) dla active, muted (#9A9A9A) dla completed
   - Górny rząd: StatusBadge (active="Aktywna"/completed="Zakończona") po prawej
   - Nazwa budowy: fontSize lg, fontWeight 900, dark
   - Adres: fontSize sm, muted
   - Dolny rząd: "X.XX t · X dostaw" + tagi klas asfaltu (małe pills)
   - Kliknięcie → router.push('/site/' + id)

4. Modal "Nowa budowa" (otwiera się przyciskiem "+"):
   - Tytuł "Nowa budowa"
   - Input: Nazwa budowy (wymagane)
   - Input: Adres
   - Dynamiczna lista klas asfaltu:
     * Pole tekstowe + przycisk "+" dodaje nową klasę
     * Każda klasa: tekst + przycisk "×" usuwa
     * Min. 1 klasa wymagana
   - Przycisk "Zapisz" — INSERT do construction_sites + asphalt_types

DANE:
- Pobierz z construction_sites JOIN get_site_summary()
- React Query do cachowania
- Pull-to-refresh

Po zakończeniu zaktualizuj memory bank.
```

---

## Etap 3 · Prompt C — Szczegóły budowy

> Wklej po ukończeniu Promptu B

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Utwórz ekran szczegółów budowy.

Wzorzec wizualny: docs/mockups/baustellen-mockup.html — ekran "Szczegóły"
Odwzoruj 1:1.

PLIK: app/site/[id].tsx

UKŁAD:

1. PageHeader:
   - title: nazwa budowy
   - subtitle: adres
   - rightAction: przycisk "Export" (tło dark, ikona "download-outline")

2. Tabela podsumowania (z get_site_summary()):
   - Nagłówek: "KLASA | DOSTAW | TONY" (uppercase, muted)
   - Wiersze: nazwa klasy | liczba | tony (decimal)
   - Footer: tło #1A1A1A, "RAZEM" | łączna liczba | suma ton (accent)

3. SectionTitle "DOSTAWY" + rightText z dzisiejszą datą i liczbą

4. Lista kart dostaw (Card.tsx):
   - Lewa strona: box z tonami (tło accentLight, tekst accent, bold, duży)
   - Środek: nazwa klasy asfaltu (bold), niżej: godzina · firma · nr LS
   - Prawa strona: ikona aparatu jeśli photo_url nie null

5. FAB "+ Dodaj dostawę":
   - Pozycja: fixed bottom right
   - onPress: router.push('/delivery/new?site_id=' + id)

DANE:
- construction_sites WHERE id = params.id
- deliveries WHERE site_id = id, ORDER BY delivery_time DESC
- get_site_summary(id)
- React Query, pull-to-refresh

Po zakończeniu zaktualizuj memory bank.
```

---

## Etap 3 · Prompt D — Formularz dostawy + OCR

> Wklej po ukończeniu Promptu C

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Utwórz formularz dodawania dostawy z OCR.

Wzorzec wizualny: docs/mockups/baustellen-mockup.html — ekran "Dodaj dostawę"
Odwzoruj 1:1.

PLIK: app/delivery/new.tsx
Parametr URL: site_id (uuid)

FLOW:

KROK 1 — Skaner (domyślny widok):
- Widok aparatu (istniejący komponent z scanner.tsx)
- Przycisk "Skanuj Lieferschein" — FAB pełna szerokość, accent
- Link "Wpisz ręcznie" — pod przyciskiem, tekst accent
- Kliknięcie "Wpisz ręcznie" → przejście do formularza bez OCR

KROK 2 — Wynik OCR:
- Baner sukcesu (tło #E8F5EF, tekst #2E7D5E, ikona ✓):
  "Dane rozpoznane — sprawdź i uzupełnij"
- Baner błędu/idle (tło #1A1A1A, ikona aparatu):
  "Zeskanuj dokument lub wpisz ręcznie"
- Formularz pre-wypełniony danymi z OCR

FORMULARZ:

1. Klasa asfaltu — pills (tylko jedna aktywna):
   - Pobierz asphalt_types WHERE site_id = params.site_id
   - Aktywna pill: tło accent, tekst white
   - Nieaktywna: tło accentLight, tekst accent

2. Tony — input numeryczny:
   - keyboardType="decimal-pad"
   - Pre-fill z OCR jeśli dostępne
   - replace(',', '.') przed parseFloat

3. Nr Lieferscheinu — input tekstowy:
   - Pre-fill z OCR

4. Dostawca/firma — input tekstowy:
   - Pre-fill z OCR

5. Godzina dostawy — time picker:
   - Domyślnie: teraz
   - Format: HH:MM

6. Zdjęcie dokumentu:
   - Miniatura zdjęcia jeśli zrobione
   - Przycisk "Zrób ponownie" pod miniaturą

7. Przycisk "Zapisz dostawę" (FAB pełna szerokość, accent):
   - INSERT do deliveries
   - Upload zdjęcia do Supabase Storage bucket 'delivery-photos'
   - Toast błędu jeśli upload nie powiedzie się
   - router.back() po sukcesie

OCR:
- Użyj istniejącego services/ocr.ts
- Wyciągnij: tons, lieferschein_nr, supplier
- Obsłuż błąd OCR gracefully — pokaż formularz pusty

TECHNICZNE:
- KeyboardAvoidingView
- ScrollView
- Wszystkie kolory z theme.ts

Po zakończeniu zaktualizuj memory bank.
```

---

## Etap 3 · Prompt E — Eksport PDF i Excel

> Wklej jako ostatni prompt Etapu 3

```
Przeczytaj .cline/memory-bank/ przed rozpoczęciem.

ZADANIE: Dodaj eksport PDF i Excel w ekranie szczegółów budowy.

Przycisk "Export" w PageHeader app/site/[id].tsx otwiera modal wyboru:
- "Eksport PDF" (ikona pdf)
- "Eksport Excel" (ikona grid)
- "Anuluj"

=== EKSPORT PDF (jsPDF) ===

Struktura dokumentu:

1. Nagłówek:
   - Lewa strona: "asphaltbau" (bold, 18px)
   - Prawa strona: data eksportu
   - Pod spodem: nazwa budowy (bold, 14px), adres (gray, 10px)
   - Zakres dat: "od [pierwsza dostawa] do [ostatnia dostawa]"
   - Linia separator

2. Tabela dostaw:
   Kolumny: Data | Godzina | Klasa asfaltu | Tony | Dostawca | Nr LS
   - Nagłówek tabeli: ciemne tło (#1A1A1A), biały tekst
   - Naprzemienne tło wierszy: white / #F5F0E8
   - Dane z deliveries ORDER BY delivery_time ASC

3. Podsumowanie:
   Tabela: Klasa asfaltu | Liczba dostaw | Łączne tony
   - Ostatni wiersz "RAZEM": bold, accent color (#E8722A)

4. Stopka:
   - "Wygenerowano: [data i godzina]"
   - "asphaltbau" po prawej

=== EKSPORT EXCEL (ExcelJS) ===
Ten sam układ danych co PDF, arkusz "Dostawy":
- Nagłówki kolumn bold
- Suma na końcu bold
- Formatowanie liczb: 0.000

=== SHARE ===
Po wygenerowaniu pliku:
- Zapisz do expo-file-system temporary directory
- Otwórz expo-sharing share sheet
- Loader (ActivityIndicator) podczas generowania

INSTALACJA (jeśli brak):
pnpm add jspdf exceljs expo-sharing

Po zakończeniu zaktualizuj memory bank — zapisz że Etap 3 ukończony.
```

---

---

# Memory Bank — pliki startowe

> Skopiuj te pliki do `.cline/memory-bank/` w swoim repo

---

## .cline/memory-bank/projectbrief.md

```markdown
# TimeTracker — Project Brief

## Firma
asphaltbau — firma budowlana, układanie asfaltu

## Aplikacja
Mobilna aplikacja do zarządzania czasem pracy ekipy budowlanej.
Polier (Michal Stosiek) zarządza zespołem i zapisuje godziny pracy.

## Stack
React Native + Expo (SDK 51) + TypeScript + Supabase + Zustand + React Query

## Repo
mstosiek7-png/timetracker-mobile (publiczne)

## Pracownicy w bazie
- Jacek Jakubik
- Michal Stosiek

## Główne funkcje (istniejące)
- Dashboard z podsumowaniem
- Widok miesięczny z godzinami pracy
- Skaner OCR dokumentów
- Zarządzanie pracownikami

## Nowe funkcje (do implementacji)
- Etap 1: Redesign UI (kremowo-pomarańczowy design system)
- Etap 2: Kalkulator asfaltu (m² × cm × gęstość = tony)
- Etap 3: Moduł Baustellen (budowy, dostawy, eksport PDF)
```

---

## .cline/memory-bank/activeContext.md

```markdown
# Active Context

## Aktualnie pracuję nad:
Etap 1 — Design System (theme.ts + komponenty bazowe)

## Ostatnio ukończone:
- (brak — start projektu)

## Następne zadanie:
Prompt A z Etapu 1 — utwórz constants/theme.ts i components/ui/

## Otwarte kwestie:
- Sprawdzić wersję Expo SDK przed instalacją nowych paczek
```

---

## .cline/memory-bank/progress.md

```markdown
# Progress

## ✅ Gotowe
- Podstawowa aplikacja (Dashboard, Miesięczny, Skaner)
- Zarządzanie pracownikami
- Supabase backend (podstawowe tabele)

## 🔄 W trakcie
- Etap 1: Design System

## 📋 Zaplanowane
- Etap 1: Redesign ekranów
- Etap 2: Kalkulator asfaltu
- Etap 3: Moduł Baustellen

## ❌ Blokery
- (brak)
```

---

## .cline/memory-bank/systemPatterns.md

```markdown
# System Patterns

## Design
- Wzorzec: flat design, zero shadows, zero gradients
- Tło: #F5F0E8 (kremowe)
- Karty: #FFFFFF z border #E8E0D0
- Accent: #E8722A (pomarańczowy)
- Ciemne elementy: #1A1A1A
- Wszystkie kolory z constants/theme.ts — zero hardcoded

## Komponenty (po Etapie 1)
components/ui/
  Card, StatusBadge, StatBox, FAB, PageHeader, SectionTitle, EmptyState

## Nawigacja (docelowa)
Dashboard / Miesięczny / Baustellen / Kalkulator / Skaner

## Kalkulacja asfaltu
m² × cm × gęstość (t/m³) ÷ 100 = tony
Gęstość domyślna: 2.40 t/m³, klucz AsyncStorage: '@calculator_density'

## Baza danych Baustellen
construction_sites → asphalt_types → deliveries
Funkcja: get_site_summary(site_id) → { name, delivery_count, total_tons }
Storage bucket: 'delivery-photos'
```

---

## .cline/memory-bank/techContext.md

```markdown
# Tech Context

## Znane problemy

### Android — separator dziesiętny
Problem: Android używa przecinka zamiast kropki
Rozwiązanie: value.replace(',', '.') przed parseFloat()

### AsyncStorage — pierwsze uruchomienie
Problem: zwraca null jeśli klucz nie istnieje
Rozwiązanie: const val = stored ? parseFloat(stored) : DEFAULT_VALUE

### jsPDF na React Native
Problem: wymaga specjalnej konfiguracji
Rozwiązanie: użyj expo-file-system do zapisu, expo-sharing do udostępnienia

### Supabase Storage upload
Problem: wymaga explicit mime type
Rozwiązanie: { contentType: 'image/jpeg' } w opcjach

### React Native Paper + custom theme
Problem: nadpisuje kolory komponentów
Rozwiązanie: przekaż własny theme do PaperProvider bazując na theme.ts

## Klucze AsyncStorage
- '@calculator_density' — gęstość asfaltu (string)

## Supabase Storage
- Bucket: 'delivery-photos' (public read)
- Ścieżka: {site_id}/{delivery_id}.jpg
```

---

# .clinerules

> Skopiuj ten plik do katalogu głównego repo jako `.clinerules`

```
# TimeTracker — Reguły Cline

## Memory Bank (OBOWIĄZKOWE)
Na początku każdej sesji: przeczytaj WSZYSTKIE pliki z .cline/memory-bank/

Na końcu każdej sesji (lub na polecenie "zapisz postęp"):
1. Zaktualizuj activeContext.md — co zrobiłeś, od czego zacząć następnym razem
2. Zaktualizuj progress.md — przenieś ukończone do sekcji Gotowe
3. Decyzja projektowa → systemPatterns.md
4. Napotkany i rozwiązany błąd → techContext.md

## Styl kodu (OBOWIĄZKOWE)
- Wszystkie kolory WYŁĄCZNIE z constants/theme.ts — nigdy hardcoded
- Komponenty bazowe z components/ui/ — nie duplikuj
- TypeScript strict — wszystkie typy jawnie zdefiniowane
- Flat design — zero shadows, zero elevation, zero gradients
- Na Android: input.replace(',', '.') przed każdym parseFloat()

## Mockupy
Przed implementacją ekranu otwórz i przeanalizuj plik HTML z docs/mockups/
Odwzoruj 1:1 — kolory, układ, typografia, zachowanie

## Instalacja paczek
Użyj pnpm (nie npm, nie yarn)
Sprawdź czy paczka nie jest już zainstalowana przed dodaniem
```

---

*Dokument wygenerowany dla projektu TimeTracker · asphaltbau · 2026*
