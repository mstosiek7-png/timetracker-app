# TimeTracker — UI Redesign Package

Paczka zawiera gotowy design system + ekrany + instrukcję dla Cline.

## 🚀 Szybki start

```bash
chmod +x install.sh
./install.sh /ścieżka/do/twojego/projektu
```

Lub jeśli jesteś już w katalogu projektu:

```bash
chmod +x install.sh
./install.sh
```

## 📦 Co zawiera paczka

```
timetracker_ui_package/
│
├── install.sh                      ← Uruchom ten plik
├── README.md                       ← Ten plik
├── CLINE_IMPLEMENTATION_GUIDE.md  ← Wklej do Cline
│
├── theme/
│   ├── colors.ts    ← #E8631A orange, #F8F4EF cream itp.
│   ├── tokens.ts    ← Spacing, Radius, Shadows, FontFamily, FontSize
│   └── index.ts
│
├── components/
│   ├── ui.tsx              ← Wszystkie bazowe komponenty
│   ├── AddEntryModal.tsx   ← Modal: dodaj/edytuj wpis
│   └── BulkEntryModal.tsx  ← Modal: zbiorcze wpisy
│
└── screens/
    ├── DashboardScreen.tsx
    ├── BaustellenScreen.tsx
    ├── SiteDetailScreen.tsx
    ├── NewDeliveryScreen.tsx
    ├── CalculatorScreen.tsx
    └── ReportsScreen.tsx
```

## Co robi skrypt

1. Weryfikuje katalog projektu (szuka `package.json`)
2. Wykrywa Expo / yarn / bun / npm
3. Kopiuje wszystkie pliki do `src/` (z backupem istniejących)
4. Instaluje brakujące zależności
5. Sprawdza konfigurację `app.json` i fontów

## Po instalacji — dla Cline

Otwórz Cline i załącz `CLINE_IMPLEMENTATION_GUIDE.md`, a następnie wpisz:

> *"Przejrzyj CLINE_IMPLEMENTATION_GUIDE.md. Pliki theme/, components/, screens/ już skopiowane do projektu. Zacznij od Fazy 0.3 (ładowanie fontów) i idź po kolei. Zintegruj nowe ekrany z istniejącymi hooks Supabase i nawigacją."*

## Ręczna instalacja zależności

Jeśli skrypt nie zadziała:

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

## Design System — główne wartości

| Token | Wartość |
|-------|---------|
| Primary | `#E8631A` |
| Background | `#F8F4EF` |
| Card bg | `#FFFFFF` |
| Font UI | DM Sans |
| Font liczby | DM Mono |
| Border radius karta | 16px |
| Border radius przycisk | 100px (pill) |
