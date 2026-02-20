# TIMETRACKER — INSTRUKCJA WDROŻENIA UI (dla Cline)

> **Cel:** Zaimplementuj nowy design systemu UI w aplikacji TimeTracker (React Native / Expo / TypeScript / Supabase) zgodnie z projektem 1:1. Wykonuj każdą fazę po kolei. Nie pomijaj żadnego kroku. Pytaj tylko gdy masz rzeczywistą wątpliwość blokującą implementację.

---

## ═══════════════════════════════════════════════
## FAZA 0 — PRZYGOTOWANIE ŚRODOWISKA
## ═══════════════════════════════════════════════

### 0.1 Zainstaluj zależności

```bash
npx expo install \
  @expo-google-fonts/dm-sans \
  @expo-google-fonts/dm-mono \
  expo-font \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-native-community/datetimepicker \
  react-native-image-picker \
  expo-barcode-scanner \
  expo-image-picker \
  react-native-safe-area-context \
  react-native-screens
```

### 0.2 Skonfiguruj app.json

Dodaj do `app.json` w sekcji `expo.plugins`:
```json
[
  "expo-barcode-scanner",
  {
    "cameraPermission": "Allow TimeTracker to access camera for scanning waybills."
  }
]
```

Dodaj do `expo.infoPlist` (iOS):
```json
{
  "NSCameraUsageDescription": "TimeTracker uses camera for scanning waybill barcodes and taking delivery photos.",
  "NSPhotoLibraryUsageDescription": "TimeTracker accesses photos for delivery documentation."
}
```

### 0.3 Załaduj fonty w App.tsx / _layout.tsx

```typescript
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
    // Alias dla bold mono — użyj Medium jako bold:
    DMMono_700Bold: DMMono_500Medium,
  });

  if (!fontsLoaded) return <SplashScreen />;
  return <NavigationContainer>...</NavigationContainer>;
}
```

---

## ═══════════════════════════════════════════════
## FAZA 1 — DESIGN SYSTEM (TOKENY)
## ═══════════════════════════════════════════════

### 1.1 Utwórz plik `src/theme/colors.ts`

```typescript
export const Colors = {
  // Brand
  orange:      '#E8631A',
  orangeLight: '#F5863A',
  orangePale:  '#FDF0E8',

  // Tła
  cream:       '#F8F4EF',
  creamDark:   '#EDE8E0',
  white:       '#FFFFFF',

  // Tekst
  black:       '#111111',
  grayDark:    '#444444',
  grayMid:     '#888888',
  grayLight:   '#CCCCCC',

  // Semantyczne statusy
  green:       '#2D9A5C',
  greenBg:     '#E8F5EE',
  blue:        '#2D6BE4',
  blueBg:      '#E8EFFE',
  red:         '#D93025',
  redBg:       '#FCE8E6',
  fzaText:     '#E65100',
  fzaBg:       '#FFF3E0',
} as const;
```

### 1.2 Utwórz plik `src/theme/tokens.ts`

```typescript
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const Radius = {
  sm: 10, md: 16, lg: 20, pill: 100,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  md: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 5,
  },
  orange: {
    shadowColor: '#E8631A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
} as const;

export const FontFamily = {
  regular:  'DMSans_400Regular',
  medium:   'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold:     'DMSans_700Bold',
  mono:     'DMMono_400Regular',
  monoBold: 'DMMono_500Medium',
} as const;

export const FontSize = {
  xs: 10, sm: 11, base: 13, md: 14, lg: 15,
  xl: 16, xxl: 18, h3: 20, h2: 22, h1: 28, display: 36,
} as const;
```

### 1.3 Utwórz `src/theme/index.ts`

```typescript
export * from './colors';
export * from './tokens';
```

**✅ Weryfikacja:** Import `import { Colors, Spacing } from '../theme'` musi działać bez błędów TypeScript.

---

## ═══════════════════════════════════════════════
## FAZA 2 — KOMPONENTY BAZOWE (src/components/ui.tsx)
## ═══════════════════════════════════════════════

Utwórz plik `src/components/ui.tsx` zawierający WSZYSTKIE poniższe komponenty. Żadnego nie pomijaj.

### AppHeader
```
Tło: Colors.orange
Padding: horizontal 20, bottom 20
Layout: row, space-between

LEFT SIDE:
  - Jeśli showBack=true: okrągły przycisk 36×36px,
    bg rgba(255,255,255,0.2), strzałka "‹" rozmiar 24px biała
  - subtitle: fontSize 13, color rgba(255,255,255,0.7), marginBottom 2
  - title: fontSize 22, fontFamily bold, color #fff, letterSpacing -0.3

RIGHT SIDE: slot na dowolny element
```

### Card
```
bg: #fff, borderRadius: 16, padding: 16
margin: horizontal 16, bottom 12
shadow: Shadows.sm

Jeśli prop `title`:
  - Row space-between z tytułem i opcjonalnym rightElement
  - Tytuł: fontSize 11, fontFamily semiBold, color grayMid,
    textTransform uppercase, letterSpacing 0.8, marginBottom 12
```

### PrimaryButton
```
bg: Colors.orange, borderRadius: 100 (pill)
Rozmiar md: paddingVertical 13, paddingHorizontal 20
Label: color #fff, fontFamily semiBold, fontSize 14
Ikona (emoji): fontSize 15, gap 6
Disabled: opacity 0.5
Loading: ActivityIndicator kolor #fff
```

### SecondaryButton
```
Identyczny układ co PrimaryButton
bg: Colors.black (#111111)
```

### OutlineButton
```
bg: transparent, borderWidth 1.5, borderColor Colors.orange
borderRadius: 100 (pill)
Label color: Colors.orange
```

### GhostButton
```
bg: transparent, bez borderu
Text: color Colors.orange, fontFamily semiBold, fontSize 13
```

### Badge
```
Warianty (bg / text):
  praca:     greenBg / green
  chorobowe: redBg / red
  urlop:     blueBg / blue
  fza:       fzaBg / fzaText (#E65100)
  active:    orangePale / orange

Styl: paddingV 4, paddingH 10, borderRadius pill
Text: fontSize 11, fontFamily semiBold, uppercase, letterSpacing 0.4
```

### Checkbox
```
Rozmiar: 20×20, borderRadius 6
Niezaznaczony: border 2px grayLight
Zaznaczony: bg orange, border orange, biały checkmark "✓" fontSize 12
```

### RadioOption
```
Row z gap 10, padding 12/14, borderRadius 10
Niezaznaczony: bg cream, border 1.5px transparent
Zaznaczony: bg orangePale, border 1.5px orange

Kółko: 18×18, border 2px
  Niezaznaczony: border grayLight
  Zaznaczony: bg orange, border orange → biała kropka 6×6 wewnątrz

Label: fontSize 14, medium → zaznaczony: color orange
```

### StatusChip
```
Paddying: vertical 8, horizontal 16
borderRadius: pill, border 1.5px
Niezaznaczony: bg cream, border creamDark, text grayDark
Zaznaczony: bg orange, border orange, text #fff
Text: fontSize 13, medium
```

### WorkerChip
```
Row z gap 6, bg creamDark, borderRadius pill
Padding: vertical 5, left 5, right 12

Avatar 24×24: bg orange, borderRadius 12, inicjał biały fontSize 11 bold
Imię: fontSize 13, medium, color black
```

### Avatar
```
Props: name (string), size (default 36)
Kółko: bg orange, wymiary size×size, borderRadius size/2
Inicjał: color #fff, fontSize size*0.37, bold
```

### SectionLabel
```
fontSize 10, fontFamily semiBold, color grayMid
textTransform uppercase, letterSpacing 0.8
margin: horizontal 16, bottom 8, top 4
```

### Divider
```
height: 1, bg: creamDark
```

### BottomNav
```
bg: #fff, height: 68
borderTop: 1px creamDark
4 tabs: Dashboard(⊞), Baustellen(🔧), Kalkulator(🔢), Raporty(📊)

Tab nieaktywny: ikona + label kolor grayLight
Tab aktywny: ikona + label kolor orange
Label: fontSize 10, medium
```

**✅ Weryfikacja:** Wszystkie komponenty eksportowane nazwanie. Żadnych błędów TypeScript.

---

## ═══════════════════════════════════════════════
## FAZA 3 — EKRAN: DASHBOARD (src/screens/DashboardScreen.tsx)
## ═══════════════════════════════════════════════

### Struktura layoutu

```
SafeAreaView (bg: cream)
├── StatusBar (barStyle: light-content, bg: orange)
├── AppHeader
│   ├── title: "TimeTracker"
│   ├── subtitle: "Dashboard"
│   └── rightElement:
│       ├── Data dzisiejsza (dd.mm.yyyy) — color rgba(255,255,255,0.75), fontSize 13
│       └── Przycisk "↪ Wyloguj"
│           └── bg rgba(255,255,255,0.15), border rgba(255,255,255,0.25)
│               borderRadius pill, padding 7/14, text #fff fontSize 13
├── StatsStrip (bg: white, borderBottom: creamDark)
│   ├── Stat: liczba pracowników / "Pracownicy"
│   ├── Stat: suma godzin dziś / "Dzisiaj"  [border-left: creamDark]
│   └── Stat: liczba wpisów   / "Wpisy"    [border-left: creamDark]
│   * Wartości: DM Mono bold, fontSize 22, color orange
│   * Etykiety: fontSize 10, semiBold, grayMid, uppercase
│
├── ScrollView
│   ├── Spacer 16px
│   ├── Card "Szybkie akcje"
│   │   └── Row gap 10:
│   │       ├── PrimaryButton "✏️ Dodaj wpis" → otwiera AddEntryModal
│   │       └── SecondaryButton "📋 Zbiorczo" → otwiera BulkEntryModal
│   │
│   ├── Card title="Ostatnie wpisy" rightElement=GhostButton "Zobacz wszystkie"
│   │   └── Lista EntryRow:
│   │       ├── Avatar (36px) + Imię (bold 14) + Meta "data · Xh" (12 grayMid)
│   │       └── Prawa strona: Badge(status) + IconBtn✏️ + IconBtn🗑️
│   │       * Każdy wiersz oddzielony Divider
│   │       * IconBtn: 30×30, borderRadius 8, bg creamDark
│   │
│   ├── Card title="Pracownicy"
│   │   └── Row flex-wrap gap 8: WorkerChip dla każdego pracownika
│   │
│   └── Card title="Zarządzanie pracownikami" rightElement=GhostButton "Zobacz wszystkich"
│       ├── Lista ManageRow: Imię (bold 14) + Rola (12 grayMid) + Badge(status)
│       │   * Oddzielone Divider
│       └── Przycisk "＋ Dodaj pracownika"
│           └── borderWidth 1.5, borderColor orange, borderRadius pill
│               paddingV 12, text orange semiBold
│
└── BottomNav active="Dashboard"
```

---

## ═══════════════════════════════════════════════
## FAZA 4 — MODAL: DODAJ / EDYTUJ WPIS (src/components/AddEntryModal.tsx)
## ═══════════════════════════════════════════════

### Struktura

```
Modal (animationType: slide, transparent)
├── Backdrop: rgba(0,0,0,0.4) — kliknięcie zamyka
└── Sheet (bg: white, borderTopRadius 24)
    ├── Handle: 40×4, bg grayLight, alignSelf center, marginTop 12
    ├── ModalHeader row space-between:
    │   ├── Tytuł "Dodaj wpis czasu pracy" / "Edytuj wpis" — fontSize 18 bold
    │   └── CloseBtn: 30×30, borderRadius 15, bg creamDark, "✕" color grayDark
    │
    ├── ScrollView z paddingH 20:
    │   │
    │   ├── SEKCJA: "Pracownik *"
    │   │   Label: 11px semiBold grayMid uppercase letterSpacing 0.8, marginBottom 8
    │   │   RadioGroup (column gap 8):
    │   │   └── RadioOption dla każdego pracownika
    │   │
    │   ├── SEKCJA: "Data *"
    │   │   └── DateBtn: bg cream, border 1.5px creamDark, borderRadius 10
    │   │       "📅 18.03.2024" — text orange semiBold 14
    │   │       → otwiera DateTimePicker
    │   │
    │   ├── SEKCJA: "Godziny pracy *"
    │   │   └── Row gap 10:
    │   │       ├── TimeBtn "🕐 08:00" (flex 1)
    │   │       │   DM Mono fontSize 15 color orange
    │   │       │   bg cream, border 1.5px creamDark, borderRadius 10
    │   │       ├── Separator "→" color grayMid fontSize 18
    │   │       ├── TimeBtn "🕐 16:00" (flex 1)
    │   │       └── TotalHours "8h" — DM Mono bold fontSize 18 color orange
    │   │   Hint: "Godziny obliczane są automatycznie" — fontSize 11, grayMid
    │   │
    │   └── SEKCJA: "Status *"
    │       └── Row flex-wrap gap 8:
    │           StatusChip × 4: "Praca" | "Chorobowe" | "Urlop" | "FZA"
    │           (jeden wybrany na raz)
    │
    └── Footer row gap 10, paddingH 20, borderTop 1px creamDark:
        ├── OutlineButton "Anuluj" (flex 1)
        └── PrimaryButton "💾 Zapisz wpis" (flex 2)
            disabled jeśli nie wybrano pracownika
```

### Logika

- `totalHours = (endTime - startTime) / 3600000` — wyświetla zaokrąglone do 0 miejsc
- Przy `entryId` prop — ładuje istniejący wpis i pre-wypełnia pola
- `handleSave()` → sprawdza czy wybrany pracownik → wywołuje `addEntry` lub `updateEntry` → zamyka modal

---

## ═══════════════════════════════════════════════
## FAZA 5 — MODAL: ZBIORCZE WPISY (src/components/BulkEntryModal.tsx)
## ═══════════════════════════════════════════════

### Struktura

```
Modal (animationType: slide, transparent)
└── Sheet (bg: white, borderTopRadius 24, maxHeight 95%)
    │
    ├── ColorHeader (bg: orange, borderTopRadius 24)
    │   ├── Handle: 40×4, bg rgba(255,255,255,0.4)
    │   ├── Tytuł "Zbiorcze wprowadzanie godzin" — bold 20 #fff
    │   └── Data "Data: 18.03.2024" — fontSize 13 rgba(255,255,255,0.75)
    │
    └── ScrollView paddingH 20:
        │
        ├── SEKCJA "Ustawienia domyślne" (bold 18 black)
        │   Grid 2 kolumny gap 12:
        │   ├── Domyślne godziny:
        │   │   └── TextInput: bg cream, border creamDark,
        │   │       DM Mono bold fontSize 22, textAlign center
        │   └── Domyślny status:
        │       └── Column gap 5: mini StatusChip z checkmarkiem "✓ Praca"
        │           dla każdego z 4 statusów
        │
        │   ApplyBtn "↓ Zastosuj do wszystkich"
        │   (border orange, borderRadius pill, text orange semiBold)
        │
        ├── SEKCJA "Data"
        │   └── DateBtn identyczny jak w AddEntryModal
        │
        ├── SEKCJA "Pracownicy"
        │   Row space-between:
        │   ├── "Pracownicy" (bold 15 black)
        │   └── "Zaznacz wszystkich" (orange) | "Odznacz wszystkich" (grayMid)
        │   Licznik: "Wybrano: 3 z 3 pracowników" — fontSize 12 grayMid
        │
        │   Tabela header row:
        │   ├── "Wybór" (width 40)
        │   ├── "Pracownik" (flex 1)
        │   ├── "Godz." (width 70)
        │   └── "Status" (width 90)
        │   Linia pod headerem: borderBottom 1px creamDark
        │
        │   Wiersze (per pracownik), paddingV 10, borderBottom creamDark:
        │   ├── Checkbox 20×20 (checked = row zaznaczony)
        │   ├── Imię (bold 13) + Rola (11 grayMid)
        │   ├── TextInput godzin (DM Mono 15, bg cream, border creamDark, borderRadius 8)
        │   └── MiniStatusGroup: 4 chipy kolumnowo (border 1.5px creamDark)
        │       Zaznaczony: bg orange border orange text #fff
        │       Tekst: "✓ Pra" / "Pra", "Cho", "Url", "FZA" (fontSize 10 bold)
        │
        └── Footer row gap 10, borderTop creamDark:
            ├── OutlineButton "Anuluj" (flex 1)
            └── PrimaryButton "✓ Zapisz (3)" (flex 2) — liczba zaznaczonych
                disabled jeśli 0 zaznaczonych
```

---

## ═══════════════════════════════════════════════
## FAZA 6 — EKRAN: BAUSTELLEN (src/screens/BaustellenScreen.tsx)
## ═══════════════════════════════════════════════

### Struktura

```
SafeAreaView
├── StatusBar orange
├── AppHeader title="Lista Budów"
│
├── TotalBar (bg white, borderBottom creamDark, paddingV 20, alignItems center)
│   ├── TotalTons: DM Mono bold fontSize 36 color orange
│   └── Label "Łącznie ton": 11 semiBold grayMid uppercase letterSpacing 0.1
│
├── ScrollView
│   └── Lista SiteCard (per budowa):
│       bg white, borderRadius 16, margin H16 B12
│       padding 16, shadow sm
│       WAŻNE: borderLeft 4px solid orange
│       Row space-between:
│       ├── LEFT:
│       │   ├── Badge "AKTYWNA" (variant: active) lub "ZAMKNIĘTA" (variant: chorobowe)
│       │   ├── Nazwa budowy — bold 16 black, marginBottom 8
│       │   └── SiteChips row flex-wrap gap 6:
│       │       ├── Chip "🚛 250.0t" — bg orangePale, text orange
│       │       ├── Chip "2 dostaw" — bg creamDark
│       │       └── Chip per klasa asfaltu — bg creamDark
│       │       (Chip: borderRadius pill, paddingV 4, paddingH 10, fontSize 11 semiBold)
│       └── Chevron "›" fontSize 22 grayLight
│
│       Tap → nawigacja do SiteDetail
│
├── FAB (Floating Action Button):
│   Position: absolute, bottom 80, alignSelf center
│   56×56, borderRadius 28, bg orange, shadow orange
│   "+" fontSize 28 #fff
│   Tap → nawigacja do NewSite
│
└── BottomNav active="Baustellen"
```

---

## ═══════════════════════════════════════════════
## FAZA 7 — EKRAN: SZCZEGÓŁY BUDOWY (src/screens/SiteDetailScreen.tsx)
## ═══════════════════════════════════════════════

### Struktura

```
SafeAreaView
├── StatusBar orange
├── AppHeader
│   ├── title: nazwa budowy
│   ├── showBack: true
│   └── rightElement: DeleteBtn "🗑 Usuń"
│       bg red #D93025, borderRadius pill, #fff text 13 semiBold
│       Tap → Alert.alert potwierdzenie → deleteSite → goBack
│
├── ScrollView
│   ├── Spacer 16px
│   │
│   ├── TABELA PODSUMOWANIA (bg white, borderRadius 16, margin H16 B12, shadow sm)
│   │   Header row (bg creamDark, paddingV 10, paddingH 14):
│   │   "Klasa asfaltu" (flex 1) | "Dostaw" (w80, center) | "Tony" (w80, right)
│   │   Header text: 10 bold grayMid uppercase letterSpacing 0.08
│   │
│   │   Wiersz per klasa asfaltu:
│   │   paddingV 12, paddingH 14, borderBottom 1px cream
│   │   ├── Klasa: 14 semiBold black (flex 1)
│   │   ├── Liczba "2×": 14 grayMid (w80, center)
│   │   └── Tony "250.0t": DM Mono bold orange (w80, right)
│   │
│   │   Wiersz RAZEM (bg black):
│   │   "RAZEM" bold #fff uppercase | "5×" rgba(255,255,255,0.7) | "275.0t" DM Mono orange
│   │
│   ├── DeliveryDateHeader (paddingH 16, row space-between):
│   │   "Dostawy — śr. 18.03.2024" (11 bold grayMid uppercase)
│   │   "2 dzisiaj" (11 bold orange)
│   │
│   └── Lista DeliveryCard (per dostawa):
│       bg white, borderRadius 10, margin H16 B8
│       padding 12, shadow sm
│       Row gap 12:
│       ├── Thumbnail 56×56: bg orangePale, borderRadius 8, emoji 🏗️ fontSize 22
│       ├── INFO:
│       │   ├── asphaltClass: 15 bold black
│       │   └── Meta: "Kemna Bau · 14:30 · LS-001" — 12 grayMid, marginTop 3
│       └── Chevron "›" 22 grayLight
│
│       Tap → DeliveryDetail
│
├── AddDeliveryButton (absolute bottom 68, right 16):
│   bg orange, borderRadius pill, paddingV 13, paddingH 22, shadow orange
│   "+ Dodaj dostawę" — #fff semiBold 14
│   Tap → NewDelivery screen
│
└── BottomNav active="Baustellen"
```

---

## ═══════════════════════════════════════════════
## FAZA 8 — EKRAN: NOWA DOSTAWA (src/screens/NewDeliveryScreen.tsx)
## ═══════════════════════════════════════════════

### Struktura

```
SafeAreaView
├── StatusBar orange
├── AppHeader
│   ├── title: "Nowa dostawa"
│   ├── subtitle: nazwa budowy
│   └── showBack: true
│
├── ScrollView
│   ├── Spacer 16px
│   │
│   ├── FieldGroup: "Klasa asfaltu"
│   │   Każdy FieldGroup: bg white, borderRadius 16, margin H16 B12, padding 16
│   │   Label: 11 semiBold grayMid uppercase letterSpacing 0.8
│   │
│   │   SelectBtn (TouchableOpacity):
│   │   bg cream, border 1.5px creamDark, borderRadius 10
│   │   paddingV 13, paddingH 16, row space-between
│   │   ├── Tekst wybranej klasy lub placeholder (color grayLight)
│   │   └── "▼" grayMid fontSize 12
│   │   Tap → Alert.alert z listą klas asfaltu do wyboru
│   │
│   ├── FieldGroup: "Waga (tony)"
│   │   InputRow: bg cream, border 1.5px creamDark, borderRadius 10
│   │   ├── TextInput (flex 1): keyboardType decimal-pad, fontSize 15 medium
│   │   └── Unit "t": paddingRight 16, fontSize 14 semiBold orange
│   │
│   ├── FieldGroup: "List przewozowy (opcjonalnie)"
│   │   Position: relative (dla ScanBtn)
│   │   TextInput identyczny
│   │   ScanBtn (position absolute, right 16, top 50%):
│   │   38×38, borderRadius 8, bg orange, "⬛" emoji
│   │   Tap → nawigacja do Scanner screen lub expo-barcode-scanner
│   │
│   ├── FieldGroup: "Dostawca (opcjonalnie)"
│   │   TextInput: bg cream, border 1.5px creamDark, borderRadius 10
│   │   paddingV 13, paddingH 16, fontSize 15 medium
│   │
│   └── FieldGroup: "Zdjęcie (opcjonalnie)"
│       Jeśli brak zdjęcia:
│       Grid 2 kolumny gap 10:
│       PhotoBtn × 2 (📷 Aparat | 🖼 Galeria)
│       bg black, borderRadius 10, paddingV 14
│       icon 18px + text #fff semiBold 14
│
│       Jeśli jest zdjęcie: Image preview 120px + "✕ Usuń zdjęcie" (red)
│
├── SaveBar (paddingH 16, paddingV 12, borderTop creamDark):
│   PrimaryButton "💾 Zapisz dostawę" (fullWidth, size lg)
│   disabled jeśli brak klasy lub wagi
│
└── BottomNav active="Baustellen"
```

### Logika zapisu

```typescript
await addDelivery({
  siteId,
  asphaltClass,           // wymagane
  tons: parseFloat(weight), // wymagane, > 0
  waybill,                // opcjonalne
  supplier,               // opcjonalne
  photoUri,               // opcjonalne
  date: today,            // auto
  time: nowTime,          // auto HH:MM
});
navigation.goBack();
```

---

## ═══════════════════════════════════════════════
## FAZA 9 — EKRAN: KALKULATOR (src/screens/CalculatorScreen.tsx)
## ═══════════════════════════════════════════════

### Wzór

```
wynik_bazowy = (powierzchnia × grubość × gęstość) / 100
wynik_końcowy = wynik_bazowy × (1 + naddatek% / 100)
```

### Struktura

```
SafeAreaView
├── StatusBar orange
├── AppHeader title="Kalkulator Asfaltu"
│
└── ScrollView
    ├── DensityCard (bg white, borderRadius 16, margin H16 B12, shadow sm)
    │   Row space-between:
    │   ├── LEFT:
    │   │   Label "Gęstość materiału" (11 semiBold grayMid uppercase)
    │   │   Value "2.40" DM Mono bold 32 orange + "t/m³" fontSize sm grayMid
    │   └── EditBtn "✏️ Zmień gęstość"
    │       bg creamDark, borderRadius pill, paddingV 8, paddingH 14
    │       Text: 13 semiBold grayDark
    │       Tap → Alert.prompt (lub Modal) z TextInput dla nowej wartości
    │
    ├── InputsRow (row gap 10, marginH 16, marginB 12)
    │   ├── InputCard (flex 1, bg white, borderRadius 16, padding 12, shadow sm)
    │   │   Header row space-between:
    │   │   ├── Label "Powierzchnia" (9px semiBold grayMid uppercase)
    │   │   └── Unit "m²" (9px grayLight)
    │   │   TextInput: DM Mono bold 26 color black, keyboardType decimal-pad
    │   └── InputCard "Grubość warstwy" z unit "cm" — identyczny układ
    │
    ├── FormulaBar (bg black, borderRadius 10, marginH 16, marginB 12, padding 12)
    │   Text center: "___m² × ___cm × 2.40 t/m³ ÷ 100 = ___t"
    │   └── Wartości pogrubione orange, reszta rgba(255,255,255,0.7) fontSize 12
    │
    ├── ResultCard (bg orange, borderRadius 16, marginH 16, marginB 12, paddingV 20)
    │   Center:
    │   ├── Label "Wynik bazowy" (11 semiBold rgba(255,255,255,0.75) uppercase)
    │   └── Row baseline: Value DM Mono bold 44 #fff + "t" fontSize 20 rgba(255,255,255,0.8)
    │   Jeśli brak danych → wyświetla "—"
    │
    ├── AddonCard (bg white, borderRadius 16, marginH 16, marginB 12, padding 16)
    │   Title "Naddatek" (11 semiBold grayMid uppercase)
    │   Row gap 8: 3 AddonChips (flex 1 każdy)
    │   ├── "+ 5%"    → value = 5
    │   ├── "+ 10%"   → value = 10
    │   └── "Własny %" → pokazuje TextInput z % poniżej
    │   Chip: bg cream, border 1.5px creamDark, borderRadius 10, paddingV 10
    │   Wybrany: bg orangePale, border orange, text orange
    │
    ├── SummaryStrip (bg black, borderRadius 16, marginH 16, marginB 12, padding 16)
    │   Wiersz: "Wynik bazowy" (rgba(255,255,255,0.6)) | "___t" (DMMono rgba(255,255,255,0.85))
    │   Separator: borderTop 1px rgba(255,255,255,0.1), marginTop 4, paddingTop 10
    │   Wiersz RAZEM: "RAZEM" (bold #fff uppercase) | "___t" (DM Mono bold 22 orange)
    │   FormulaHint: "24.00t + 5% = 25.20t" — rgba(255,255,255,0.4) 11 right
    │
    └── ClearBtn (marginH 16, marginB 12)
        border 1.5px creamDark, borderRadius 10, paddingV 12, center
        "↺ Wyczyść kalkulator" — 13 semiBold grayMid
        Tap → zeruje wszystkie stany
```

### Logika kalkulatora (WAŻNE — wszystko real-time, bez "Oblicz")

```typescript
const [density, setDensity]     = useState(2.40);
const [area, setArea]           = useState('');
const [thickness, setThickness] = useState('');
const [addon, setAddon]         = useState<number|null>(null); // null|5|10|-1(custom)
const [customAddon, setCustomAddon] = useState('');

const areaNum      = parseFloat(area)      || 0;
const thicknessNum = parseFloat(thickness) || 0;
const baseResult   = (areaNum * thicknessNum * density) / 100;
const addonPct     = addon === -1 ? (parseFloat(customAddon) || 0) : (addon ?? 0);
const totalResult  = baseResult * (1 + addonPct / 100);
const hasResult    = areaNum > 0 && thicknessNum > 0;
const fmt = (n: number) => hasResult ? n.toFixed(2) : '—';
```

---

## ═══════════════════════════════════════════════
## FAZA 10 — EKRAN: RAPORTY (src/screens/ReportsScreen.tsx)
## ═══════════════════════════════════════════════

### Struktura

```
SafeAreaView
├── StatusBar orange
├── AppHeader title="Raporty i Eksport"
│
├── StatsStrip (bg white, borderBottom creamDark)
│   3 staty: "Xh / Łącznie godzin" | "X / Wpisy" | "X / Pracownicy"
│   DM Mono bold fontSize 18 orange (mniejszy niż Dashboard)
│
└── ScrollView
    ├── Card "Zakres dat"
    │   DateTabs (3 taby flex row):
    │   "Bieżący miesiąc" | "Poprzedni miesiąc" | "Niestandardowy"
    │   Nieaktywny: bg cream, borderRadius 10
    │   Aktywny: bg orange, text #fff
    │
    │   DateRangeRow (2 kolumny gap 10):
    │   ├── Label "Od:" + DateBtn "📅 01.03.2024"
    │   └── Label "Do:" + DateBtn "📅 31.03.2024"
    │   DateBtn: bg cream, border 1.5px creamDark, row, text black semiBold
    │   Tap (custom mode) → DateTimePicker + ustaw rangeMode na 'custom'
    │
    ├── Card "Pracownicy"
    │   Header row space-between:
    │   ├── "Pracownicy" cardTitle
    │   └── "Wszyscy" (orange) | "Wyczyść" (grayMid)
    │   Hint: "Wszyscy pracownicy..." — 12 grayMid
    │   WorkerChips: flex-wrap gap 8
    │   Chip nieaktywny: bg creamDark
    │   Chip aktywny (zaznaczony lub wszyscy): bg orangePale, border orange, text orange
    │
    ├── Card "Opcje eksportu"
    │   2 ExportCards flex row gap 10:
    │   ├── Excel Card: "📊" emoji + "Excel (.xlsx)" bold + "Edytowalny" hint
    │   └── PDF Card:   "📄" emoji + "PDF (.pdf)" bold + "Do druku" hint
    │   Nieaktywny: bg cream, border 2px transparent
    │   Aktywny: bg orange, border orange, text/hint #fff / rgba(255,255,255,0.8)
    │
    │   NotesRow: Checkbox + "Uwzględnij notatki" (medium 14 black)
    │
    ├── Card "Podsumowanie statusów"
    │   4 wiersze per status (paddingV 7, borderBottom cream):
    │   Badge(status) ... Xh (DM Mono bold black | grayMid jeśli 0)
    │
    ├── GenerateBtn sekcja (paddingH 16, marginB 12):
    │   PrimaryButton "📥 Generuj raport" (fullWidth, size lg)
    │   z loading state
    │
    └── Card "Zapisane raporty"
        Header: "Zapisane raporty" + 🔄 przycisk odświeżania
        Lista: nazwa raportu (semiBold) ... data (grayMid)
        Pusty stan: "Brak zapisanych raportów" italic
```

---

## ═══════════════════════════════════════════════
## FAZA 11 — NAWIGACJA (src/navigation/AppNavigator.tsx)
## ═══════════════════════════════════════════════

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"    component={DashboardScreen} />
      <Stack.Screen name="Baustellen"   component={BaustellenScreen} />
      <Stack.Screen name="SiteDetail"   component={SiteDetailScreen} />
      <Stack.Screen name="NewSite"      component={NewSiteScreen} />
      <Stack.Screen name="NewDelivery"  component={NewDeliveryScreen} />
      <Stack.Screen name="Calculator"   component={CalculatorScreen} />
      <Stack.Screen name="Reports"      component={ReportsScreen} />
      <Stack.Screen name="Workers"      component={WorkersScreen} />
      <Stack.Screen name="AddWorker"    component={AddWorkerScreen} />
      <Stack.Screen name="AllEntries"   component={AllEntriesScreen} />
    </Stack.Navigator>
  );
}
```

**WAŻNE:** Wszystkie ekrany mają `headerShown: false` — własne headery w każdym screen.

---

## ═══════════════════════════════════════════════
## FAZA 12 — INTEGRACJA Z SUPABASE (istniejące hooks)
## ═══════════════════════════════════════════════

Komponenty UI oczekują następujących hooks. Jeśli jeszcze nie istnieją — utwórz je z integracją Supabase:

### `src/hooks/useWorkers.ts`
```typescript
interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  currentStatus?: string;
}

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  // Pobiera z tabeli: workers
  return { workers };
}
```

### `src/hooks/useTimeEntries.ts`
```typescript
interface TimeEntry {
  id: string;
  workerId: string;
  workerName: string;
  date: string;         // "YYYY-MM-DD"
  startTime: string;    // ISO string
  endTime: string;      // ISO string
  hours: number;
  status: string;       // "Praca"|"Chorobowe"|"Urlop"|"FZA"
}

export function useTimeEntries() {
  return {
    entries: TimeEntry[],
    recentEntries: TimeEntry[],     // ostatnie 5-10
    totalHoursToday: number,
    addEntry: (payload) => Promise<void>,
    updateEntry: (id, payload) => Promise<void>,
    bulkAddEntries: (entries) => Promise<void>,
    getEntry: (id) => TimeEntry | undefined,
  };
}
```

### `src/hooks/useBaustellen.ts`
```typescript
interface DeliveryItem {
  id: string;
  siteId: string;
  asphaltClass: string;
  tons: number;
  waybill?: string;
  supplier?: string;
  photoUri?: string;
  date: string;
  time: string;
}

interface Site {
  id: string;
  name: string;
  active: boolean;
  totalTons: number;
  deliveryCount: number;
  asphaltClasses: string[];
  deliveries: DeliveryItem[];
  asphaltSummary: Array<{ class: string; count: number; tons: number }>;
}

export function useBaustellen() {
  return {
    sites: Site[],
    totalTons: number,
    getSite: (id: string) => Site | undefined,
    addDelivery: (payload) => Promise<void>,
    deleteSite: (id: string) => Promise<void>,
  };
}
```

### `src/hooks/useReports.ts`
```typescript
export function useReports() {
  return {
    getStats: ({ dateFrom, dateTo, workerIds }) => ({
      totalHours: number,
      entryCount: number,
      workerCount: number,
      byStatus: { praca: number, chorobowe: number, urlop: number, fza: number },
    }),
    generateReport: ({ dateFrom, dateTo, workerIds, format, includeNotes }) => Promise<void>,
    savedReports: Array<{ id: string; name: string; createdAt: string }>,
  };
}
```

---

## ═══════════════════════════════════════════════
## FAZA 13 — WERYFIKACJA KOŃCOWA
## ═══════════════════════════════════════════════

Po implementacji każdej fazy sprawdź:

### Kolory — muszą być dokładnie:
```
Orange:     #E8631A  ← NIE #FF6B00, NIE #E07020
Cream:      #F8F4EF
CreamDark:  #EDE8E0
OrangePale: #FDF0E8
Black:      #111111
Green:      #2D9A5C
Blue:       #2D6BE4
Red:        #D93025
FZA:        #E65100 na #FFF3E0
```

### Fonty — muszą być:
```
UI: DM Sans (400/500/600/700)
Liczby/monospace: DM Mono (400/500)
Liczby nie mogą używać systemowego fontu
```

### BorderRadius — muszą być:
```
Karty: 16px
Małe elementy: 10px
Przyciski/chipy: 100px (pill)
Avatar: 50% (kółko)
```

### Cienie:
```
shadow-sm: offset(0,1), opacity 0.08, radius 3
shadow-md: offset(0,4), opacity 0.10, radius 16
```

### BottomNav:
- Zawsze widoczna na wszystkich 4 głównych ekranach
- Aktywna zakładka: orange
- Height: 68px

### Backgorund główny: `#F8F4EF` (cream) — NIE biały

---

## ═══════════════════════════════════════════════
## UWAGI DLA CLINE
## ═══════════════════════════════════════════════

1. **Nie zmieniaj logiki biznesowej** — tylko UI. Hooks i Supabase queries zostawiaj jak są, chyba że brakuje interfejsu/typu.

2. **Nie używaj inline styles** — wszystko w StyleSheet.create(). Wyjątek: dynamiczne wartości (np. `{ width: size }`).

3. **Fonty są kluczowe** — każde miejsce z liczbą (godziny, tony, wartości) używa `DMMono_500Medium` lub `DMMono_700Bold` (alias).

4. **StatusBar** — zawsze `barStyle="light-content"` i `backgroundColor={Colors.orange}` na wszystkich ekranach z pomarańczowym headerem.

5. **Modale** — animationType="slide", transparent=true, KeyboardAvoidingView dla formularzy.

6. **Alert.prompt** (iOS only) — dla zmiany gęstości w kalkulatorze na Androidzie użyj custom modal z TextInput.

7. **Kolejność implementacji:** Faza 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13. Nie skacz naprzód.

8. **Plik referencyjny HTML:** `TimeTracker_UI.html` — zawiera wizualne wzorce wszystkich 8 ekranów z dokładnymi wartościami CSS które należy odwzorować 1:1.

---

*Wygenerowano automatycznie na podstawie projektu UI TimeTracker — plik referencyjny: TimeTracker_UI.html*
