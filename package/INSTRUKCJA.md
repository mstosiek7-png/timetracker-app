# TimeTracker — Redesign UI

## Co jest w tej paczce?
- `app-mockup.html` — interaktywny mockup 3 ekranów (otwórz w przeglądarce)
- `PROMPT.txt` — gotowy prompt do wklejenia w Copilot Chat
- `SCHEMA.sql` — struktura bazy Supabase (dla kontekstu)

---

## Jak wdrożyć?

### Krok 1 — Przygotowanie
1. Wrzuć wszystkie pliki z tej paczki do głównego folderu projektu React Native
2. Otwórz VSCode z projektem
3. Otwórz Copilot Chat (Ctrl+Alt+I)

### Krok 2 — Zmień model na Claude
1. W Copilot Chat kliknij nazwę modelu (np. GPT-4o)
2. Wybierz Claude Sonnet

### Krok 3 — Wklej prompt
1. Otwórz PROMPT.txt
2. Skopiuj całą treść
3. Wklej do Copilot Chat i wyślij

### Krok 4 — Praca ekran po ekranie
- Poczekaj aż Claude przeskanuje projekt i pokaże pliki
- Zatwierdzaj po każdym ekranie
- Baustellen jest ostatni — najpierw wygląd, potem kalendarz

---

## Ekrany do przepisania

| Ekran | Zmiany | Nowe funkcje |
|-------|--------|--------------|
| Dashboard | Nowy wygląd, usunięty summary bar | FAB z 3 opcjami |
| Baustellen | Nowy wygląd | Kalendarz tygodniowy (nowy komponent) |
| Raporty | Nowy wygląd, usunięty summary bar | Bez zmian funkcji |

---

## FAB — przyciski

**Dashboard:**
- Dodaj wpis
- Wszyscy
- Dodaj pracownika

**Baustellen:**
- Dodaj budowę

---

## Baza Supabase — tabele używane w kalendarzu

- `construction_sites` — budowy (id, name, status)
- `deliveries` — dostawy (id, site_id, tons, delivery_time, asphalt_type_id)
- `asphalt_types` — typy asfaltu (id, site_id, name)
