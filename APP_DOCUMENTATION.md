# Dokumentacja Aplikacji TimeTracker

## Opis Ogólny
**TimeTracker** to profesjonalna aplikacja mobilna zaprojektowana dla sektora budowlanego (ze szczególnym uwzględnieniem budownictwa drogowego). Aplikacja integruje funkcje rejestracji czasu pracy personelu z logistyką dostaw materiałów (asfaltu), umożliwiając kompleksowe zarządzanie projektami bezpośrednio z poziomu smartfona.

## Przeznaczenie i Cele
Głównym celem aplikacji jest eliminacja papierowej dokumentacji na placu budowy oraz zapewnienie przepływu danych w czasie rzeczywistym między terenem a biurem. 
- **Dla brygadzistów:** Ułatwia raportowanie godzin i dostaw.
- **Dla kierowników projektów:** Zapewnia natychmiastowy wgląd w koszty (robocizna) i materiały.
- **D dla administracji:** Automatyzuje proces generowania raportów do rozliczeń i płac.

## Kluczowe Funkcje

### 1. System Rejestracji Czasu Pracy
- **Panel Dashboard:** Szybki wgląd w aktualny stan zatrudnienia i przepracowane godziny w danym dniu.
- **Indywidualne i Zbiorcze Wpisy:** Możliwość dodawania godzin dla jednego pracownika lub całego zespołu za pomocą kilku kliknięć.
- **Statusy Pracy:** Obsługa różnych typów obecności:
  - Praca (standardowa),
  - Chorobowe,
  - Urlop,
  - FZA (Freizeitausgleich - odbiór nadgodzin).
- **Zarządzanie Pracownikami:** Baza danych pracowników z przypisanymi rolami i inicjałami (Avatar system).

### 2. Zarządzanie Budowami (Baustellen)
- **Repozytorium Projektów:** Centralna lista placów budowy z informacją o ich statusie (aktywna/zamknięta).
- **Monitoring Materiałów:** Śledzenie łącznej wagi dostarczonego asfaltu na każdą budowę.
- **Szczegóły Budowy:** Podgląd tabelaryczny dostaw w podziale na klasy asfaltu, dostawców i konkretne daty.

### 3. Logistyka i Dostawy
- **Rejestracja Dostaw:** Logowanie każdej naczepy/transportu z określeniem wagi (tony), dostawcy i klasy materiału.
- **Technologia OCR i Skanowanie:** Wbudowana funkcja skanowania listów przewozowych (waybills) przy użyciu aparatu, co automatycznie wyodrębnia dane tekstowe.
- **Dokumentacja Foto:** Przechowywanie zdjęć dokumentów i postępów prac w chmurze.

### 4. Specjalistyczny Kalkulator Asfaltu
- Narzędzie do precyzyjnego wyliczania zapotrzebowania na masę bitumiczną w czasie rzeczywistym.
- Bierze pod uwagę: powierzchni (m²), grubości warstwy (cm) oraz gęstość materiału (t/m³).
- Funkcja naddatku (bufor bezpieczeństwa) pozwala na korektę wyników o określony procent.

### 5. Raportowanie i Eksport Danych
- Zaawansowane filtry (daty, pracownicy, projekty).
- **Eksport do Excel (.xlsx):** Generowanie arkuszy danych gotowych do analizy finansowej.
- **Eksport do PDF:** Tworzenie profesjonalnych dokumentów do druku lub wysyłki e-mailem.

## Architektura Techniczna
- **Rdzeń:** React Native & Expo (zapewnia płynne działanie na iOS i Android).
- **Baza Danych:** Supabase (PostgreSQL) z mechanizmem synchronizacji w czasie rzeczywistym.
- **Bezpieczeństwo:** Autentykacja przez Supabase, wsparcie dla biometrii (Local Authentication).
- **Tryb Offline:** Aplikacja pozwala na pracę bez dostępu do sieci, synchronizując dane po odzyskaniu połączenia.
- **Design System:** Nowoczesny UI oparty na kolorystyce brandowej (Orange #E8631A) z naciskiem na czytelność w warunkach zewnętrznych.

---
*Dokument wygenerowany automatycznie na podstawie analizy struktury projektu.*
