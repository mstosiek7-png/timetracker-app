# 📱 TimeTracker - System Rejestracji Czasu Pracy

> Mobilna aplikacja do zarządzania czasem pracy pracowników budowlanych z funkcją skanowania dokumentów OCR

## 🎯 O Projekcie

TimeTracker to nowoczesna aplikacja mobilna stworzona dla firm budowlanych, umożliwiająca:

- ✅ Łatwe zarządzanie pracownikami (dodawanie, edycja, usuwanie)
- ✅ Rejestrację czasu pracy (indywidualnie lub dla całej ekipy)
- ✅ Widok kalendarzowy z podsumowaniem miesięcznym
- ✅ Różne statusy: Praca, Chorobowe, Urlop, FZA
- ✅ Pełną historię zmian (audit log)
- ✅ Export do Excel i PDF
- ✅ Skanowanie dokumentów dostaw z OCR
- ✅ Tryb offline z automatyczną synchronizacją

## 🛠️ Stack Technologiczny

### Frontend
- **React Native** + **Expo** - Cross-platform (iOS + Android)
- **TypeScript** - Type safety
- **Zustand** - Local state management
- **React Query** - Server state & caching
- **React Native Paper** - Material Design UI

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL - Baza danych
  - Auth - Uwierzytelnianie
  - Storage - Przechowywanie plików
  - Realtime - Synchronizacja na żywo
  - Edge Functions - Serverless functions

### Narzędzia
- **Expo Camera** - Dostęp do kamery
- **Tesseract.js / OpenAI Vision** - OCR
- **ExcelJS** - Generowanie Excel
- **jsPDF** - Generowanie PDF

## 📂 Struktura Projektu

```
timetracker-mobile/
├── app/                          # Expo Router - ekrany
│   ├── (tabs)/                  # Bottom tabs navigation
│   │   ├── index.tsx           # Dashboard
│   │   ├── employees.tsx       # Lista pracowników
│   │   ├── scanner.tsx         # Scanner OCR
│   │   └── reports.tsx         # Raporty
│   └── employee/[id].tsx       # Szczegóły pracownika
│
├── components/                   # Komponenty UI
│   ├── ui/                     # Podstawowe komponenty
│   ├── employee/               # Komponenty pracowników
│   ├── time/                   # Komponenty czasu pracy
│   └── shared/                 # Współdzielone komponenty
│
├── services/                     # Business logic
│   ├── supabase.ts            # Klient Supabase
│   ├── database.ts            # Operacje DB
│   ├── ocr.ts                 # Serwis OCR
│   ├── export.ts              # Export Excel/PDF
│   └── sync.ts                # Synchronizacja offline
│
├── stores/                       # Zustand stores
│   ├── employeeStore.ts
│   ├── timeEntryStore.ts
│   └── syncStore.ts
│
├── hooks/                        # Custom React hooks
│   ├── useEmployees.ts
│   ├── useTimeEntries.ts
│   └── useOfflineSync.ts
│
├── utils/                        # Narzędzia pomocnicze
├── types/                        # TypeScript types
│
├── supabase/                     # Supabase config
│   ├── migrations/             # SQL migrations
│   └── functions/              # Edge functions
│
├── cline-skills/                 # Skille dla Cline AI
│   ├── timetracker/
│   └── timetracker-supabase/
│
├── docs/                         # Dokumentacja
│   ├── DOKUMENTACJA_TECHNICZNA.md
│   └── SETUP_GUIDE_VSCODE_CLINE.md
│
└── README.md
```

## 🚀 Szybki Start

### Wymagania

- Node.js 18+
- pnpm lub npm
- Expo CLI
- Supabase CLI
- VSCode (opcjonalnie z Cline)

### Instalacja

```bash
# 1. Utwórz projekt
npx create-expo-app timetracker-mobile --template blank-typescript
cd timetracker-mobile

# 2. Zainstaluj zależności
pnpm install @supabase/supabase-js @tanstack/react-query zustand
pnpm install react-native-paper date-fns exceljs jspdf

# 3. Zainstaluj Expo modules
npx expo install expo-camera expo-file-system expo-sharing

# 4. Inicjalizuj Supabase
supabase init
supabase link --project-ref YOUR_PROJECT_REF

# 5. Zastosuj migracje bazy danych
# (skopiuj SQL z docs/DOKUMENTACJA_TECHNICZNA.md)
supabase db push

# 6. Generuj TypeScript types
supabase gen types typescript --local > types/database.types.ts

# 7. Skonfiguruj zmienne środowiskowe
cp .env.example .env.local
# Edytuj .env.local i dodaj swoje klucze

# 8. Uruchom aplikację
npx expo start
```

### Konfiguracja .env.local

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (opcjonalnie dla advanced OCR)
EXPO_PUBLIC_OPENAI_API_KEY=your-key
```

## 📖 Dokumentacja

- 📄 [Dokumentacja Techniczna](./docs/DOKUMENTACJA_TECHNICZNA.md) - Pełna dokumentacja architektury, bazy danych i implementacji
- 🤖 [Setup Guide VSCode + Cline](./docs/SETUP_GUIDE_VSCODE_CLINE.md) - Konfiguracja środowiska developerskiego z AI assistance
- 🗄️ [Database Schema](./docs/DOKUMENTACJA_TECHNICZNA.md#struktura-bazy-danych) - Szczegółowy opis tabel i relacji

## 🧰 Rozwój z Cline AI

Projekt jest zoptymalizowany do pracy z **Cline** (Claude Dev) w VSCode:

1. **Zainstaluj Cline** z VSCode Extensions
2. **Skonfiguruj skille** (znajdują się w `/cline-skills`)
3. **Dodaj MCP servers** dla Supabase i Postgres

Cline automatycznie:
- ✅ Używa właściwych wzorców projektowych
- ✅ Generuje kod TypeScript z typami
- ✅ Tworzy migracje bazy danych
- ✅ Dodaje testy i dokumentację
- ✅ Stosuje best practices React Native

**Przykładowe komendy dla Cline:**

```
"Utwórz screen do masowego dodawania godzin dla ekipy"
"Dodaj komponent Calendar z highlightowaniem dni z wpisami"
"Zaimplementuj offline sync queue"
"Stwórz funkcję exportu do PDF z logo firmy"
```

Zobacz [SETUP_GUIDE_VSCODE_CLINE.md](./docs/SETUP_GUIDE_VSCODE_CLINE.md) dla szczegółów.

## 🗄️ Baza Danych

### Główne Tabele

| Tabela | Opis |
|--------|------|
| `employees` | Dane pracowników (id, name, position, active) |
| `time_entries` | Wpisy czasu pracy (employee_id, date, hours, status) |
| `change_history` | Audit log - automatycznie logowane zmiany |
| `documents` | Zeskanowane dokumenty z OCR |
| `sync_queue` | Kolejka synchronizacji offline |

### Funkcje PostgreSQL

- `bulk_add_hours()` - Masowe dodawanie godzin
- `get_employee_month_summary()` - Podsumowanie miesięczne
- `get_monthly_report()` - Raport dla wszystkich pracowników
- `export_time_entries()` - Export danych do CSV/JSON

### Triggery

- **Audit Logging** - Automatyczne logowanie zmian w `change_history`
- **Updated At** - Automatyczna aktualizacja `updated_at`
- **Validation** - Walidacja danych przed zapisem

## 📱 Features

### ✅ Zaimplementowane

- [x] Zarządzanie pracownikami (CRUD)
- [x] Rejestracja czasu pracy (indywidualnie + bulk)
- [x] Widok miesięczny z kalendarzem
- [x] Statusy pracy (work, sick, vacation, fza)
- [x] Historia zmian z audit log
- [x] Export do CSV
- [x] Podstawowy interfejs OCR

### 🚧 W Trakcie Implementacji

- [ ] Pełna funkcjonalność OCR
- [ ] Export do PDF z layoutem
- [ ] Offline sync z kolejką
- [ ] Push notifications
- [ ] Filtry i wyszukiwanie
- [ ] Statystyki i wykresy

### 📋 Roadmap

**Faza 1: MVP (4 tygodnie)**
- Pełna funkcjonalność time tracking
- Export Excel z miesięcznym zestawieniem
- Podstawowe OCR

**Faza 2: Offline & Sync (2 tygodnie)**
- Offline-first architecture
- Sync queue z retry logic
- Conflict resolution

**Faza 3: Advanced Features (3 tygodnie)**
- Advanced OCR z AI
- PDF reports z logo i branding
- Statystyki i dashboardy
- Multi-language support

**Faza 4: Production Ready (2 tygodnie)**
- Testing (unit + e2e)
- Performance optimization
- App Store deployment
- User documentation

## 🧪 Testowanie

```bash
# Unit tests
npm test

# E2E tests (Detox)
npm run test:e2e

# TypeScript check
npx tsc --noEmit

# Linting
npm run lint
```

## 📦 Deployment

### Development Build

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Production Build

```bash
# Build dla obu platform
eas build --profile production --platform all

# Submit do stores
eas submit --platform ios
eas submit --platform android
```

## 🤝 Contributing

1. Fork projektu
2. Utwórz branch dla feature (`git checkout -b feature/AmazingFeature`)
3. Commit zmian (`git commit -m 'Add AmazingFeature'`)
4. Push do brancha (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

## 📄 Licencja

Ten projekt jest prywatny. Wszystkie prawa zastrzeżone.

## 👤 Autor

**Michal**
- Firma: asphaltbau
- Stanowisko: Foreman (Polier) od Kwietnia 2026
- Projekt: BrukarApp & TimeTracker

## 🙏 Podziękowania

- Anthropic za Claude i możliwości AI assistance
- Supabase za świetny BaaS platform
- Expo za najprostszy sposób na React Native
- Community React Native za wsparcie

## 📞 Kontakt

Pytania? Zgłaszaj issues na GitHubie lub kontaktuj się bezpośrednio.

---

**Zbudowane z ❤️ dla branży budowlanej**

*Zarządzaj czasem pracy swoich pracowników tak łatwo, jak nigdy dotąd.*
