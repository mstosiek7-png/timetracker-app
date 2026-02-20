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
