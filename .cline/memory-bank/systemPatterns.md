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
