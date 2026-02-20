#!/usr/bin/env bash
# ============================================================
# TimeTracker UI — Skrypt instalacyjny
# Użycie: ./install.sh [ścieżka_do_projektu]
# Przykład: ./install.sh /Users/michal/projects/TimeTracker
# Bez argumentu: szuka projektu w bieżącym katalogu
# ============================================================

set -e

# ─── Kolory ─────────────────────────────────────────────────
GREEN="\033[0;32m"
ORANGE="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
BOLD="\033[1m"
RESET="\033[0m"

ok()   { echo -e "${GREEN}  ✓  $1${RESET}"; }
info() { echo -e "${BLUE}  →  $1${RESET}"; }
warn() { echo -e "${ORANGE}  ⚠  $1${RESET}"; }
err()  { echo -e "${RED}  ✗  $1${RESET}"; }
sep()  { echo -e "${ORANGE}${BOLD}────────────────────────────────────────${RESET}"; }

# ─── Baner ──────────────────────────────────────────────────
echo ""
echo -e "${ORANGE}${BOLD}"
echo "  ████████╗██╗███╗   ███╗███████╗"
echo "  ╚══██╔══╝██║████╗ ████║██╔════╝"
echo "     ██║   ██║██╔████╔██║█████╗  "
echo "     ██║   ██║██║╚██╔╝██║██╔══╝  "
echo "     ██║   ██║██║ ╚═╝ ██║███████╗"
echo "     ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝"
echo ""
echo "  TRACKER — UI Redesign Installer"
echo -e "${RESET}"
sep

# ─── Znajdź katalog projektu ─────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -n "$1" ]; then
  PROJECT_DIR="$1"
else
  # Szukaj package.json w bieżącym katalogu lub rodzicu
  if [ -f "$(pwd)/package.json" ]; then
    PROJECT_DIR="$(pwd)"
  elif [ -f "$(pwd)/../package.json" ]; then
    PROJECT_DIR="$(pwd)/.."
  else
    err "Nie znaleziono projektu React Native (brak package.json)"
    echo ""
    echo "  Użycie: ./install.sh /ścieżka/do/projektu"
    exit 1
  fi
fi

PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

# ─── Weryfikacja projektu ────────────────────────────────────
sep
echo -e "${BOLD}  Weryfikacja projektu...${RESET}"
sep

if [ ! -f "$PROJECT_DIR/package.json" ]; then
  err "Brak package.json w: $PROJECT_DIR"
  exit 1
fi
ok "Znaleziono package.json: $PROJECT_DIR"

# Sprawdź czy to Expo
if grep -q '"expo"' "$PROJECT_DIR/package.json" 2>/dev/null; then
  ok "Wykryto projekt Expo"
  USE_EXPO=true
else
  warn "Nie wykryto Expo — instalacja pakietów przez npm"
  USE_EXPO=false
fi

# Sprawdź menedżer pakietów
if [ -f "$PROJECT_DIR/yarn.lock" ]; then
  PKG_MGR="yarn"
  INSTALL_CMD="yarn add"
elif [ -f "$PROJECT_DIR/bun.lockb" ]; then
  PKG_MGR="bun"
  INSTALL_CMD="bun add"
else
  PKG_MGR="npm"
  INSTALL_CMD="npm install"
fi
ok "Menedżer pakietów: $PKG_MGR"

# Znajdź katalog src
if [ -d "$PROJECT_DIR/src" ]; then
  SRC_DIR="$PROJECT_DIR/src"
elif [ -d "$PROJECT_DIR/app" ]; then
  SRC_DIR="$PROJECT_DIR/app"
else
  warn "Brak katalogu src/ ani app/ — tworzę src/"
  mkdir -p "$PROJECT_DIR/src"
  SRC_DIR="$PROJECT_DIR/src"
fi
ok "Katalog źródłowy: $SRC_DIR"

# ─── Kopia plików ───────────────────────────────────────────
sep
echo -e "${BOLD}  Kopiowanie plików...${RESET}"
sep

copy_with_backup() {
  local src="$1"
  local dst="$2"
  local name="$3"

  mkdir -p "$(dirname "$dst")"

  if [ -f "$dst" ]; then
    cp "$dst" "${dst}.backup"
    warn "Backup: ${name}.backup"
  fi

  cp "$src" "$dst"
  ok "Skopiowano: $name"
}

# theme/
copy_with_backup "$SCRIPT_DIR/theme/colors.ts"  "$SRC_DIR/theme/colors.ts"  "theme/colors.ts"
copy_with_backup "$SCRIPT_DIR/theme/tokens.ts"  "$SRC_DIR/theme/tokens.ts"  "theme/tokens.ts"
copy_with_backup "$SCRIPT_DIR/theme/index.ts"   "$SRC_DIR/theme/index.ts"   "theme/index.ts"

# components/
copy_with_backup "$SCRIPT_DIR/components/ui.tsx"            "$SRC_DIR/components/ui.tsx"            "components/ui.tsx"
copy_with_backup "$SCRIPT_DIR/components/AddEntryModal.tsx" "$SRC_DIR/components/AddEntryModal.tsx" "components/AddEntryModal.tsx"
copy_with_backup "$SCRIPT_DIR/components/BulkEntryModal.tsx" "$SRC_DIR/components/BulkEntryModal.tsx" "components/BulkEntryModal.tsx"

# screens/
copy_with_backup "$SCRIPT_DIR/screens/DashboardScreen.tsx"  "$SRC_DIR/screens/DashboardScreen.tsx"  "screens/DashboardScreen.tsx"
copy_with_backup "$SCRIPT_DIR/screens/BaustellenScreen.tsx" "$SRC_DIR/screens/BaustellenScreen.tsx" "screens/BaustellenScreen.tsx"
copy_with_backup "$SCRIPT_DIR/screens/SiteDetailScreen.tsx" "$SRC_DIR/screens/SiteDetailScreen.tsx" "screens/SiteDetailScreen.tsx"
copy_with_backup "$SCRIPT_DIR/screens/NewDeliveryScreen.tsx" "$SRC_DIR/screens/NewDeliveryScreen.tsx" "screens/NewDeliveryScreen.tsx"
copy_with_backup "$SCRIPT_DIR/screens/CalculatorScreen.tsx" "$SRC_DIR/screens/CalculatorScreen.tsx" "screens/CalculatorScreen.tsx"
copy_with_backup "$SCRIPT_DIR/screens/ReportsScreen.tsx"    "$SRC_DIR/screens/ReportsScreen.tsx"    "screens/ReportsScreen.tsx"

# Kopiuj guide do projektu (dla Cline)
copy_with_backup "$SCRIPT_DIR/CLINE_IMPLEMENTATION_GUIDE.md" "$PROJECT_DIR/CLINE_IMPLEMENTATION_GUIDE.md" "CLINE_IMPLEMENTATION_GUIDE.md"

# ─── Instalacja zależności ───────────────────────────────────
sep
echo -e "${BOLD}  Instalacja zależności npm...${RESET}"
sep

cd "$PROJECT_DIR"

PACKAGES=(
  "@expo-google-fonts/dm-sans"
  "@expo-google-fonts/dm-mono"
  "expo-font"
  "@react-navigation/native"
  "@react-navigation/native-stack"
  "@react-native-community/datetimepicker"
  "react-native-image-picker"
  "react-native-safe-area-context"
  "react-native-screens"
)

EXPO_PACKAGES=(
  "expo-barcode-scanner"
  "expo-image-picker"
)

# Sprawdź które pakiety już są zainstalowane
MISSING_PACKAGES=()
MISSING_EXPO=()

for pkg in "${PACKAGES[@]}"; do
  pkg_name="${pkg%%@*}"
  if [ "$pkg" != "${pkg%%@*}" ]; then
    pkg_name="$pkg"
  fi
  # Usuń wersję z nazwy do sprawdzenia
  base_name=$(echo "$pkg" | sed 's/@[0-9].*//')
  if ! grep -q "\"$base_name\"" package.json 2>/dev/null; then
    MISSING_PACKAGES+=("$pkg")
  else
    ok "Już zainstalowany: $base_name"
  fi
done

for pkg in "${EXPO_PACKAGES[@]}"; do
  base_name=$(echo "$pkg" | sed 's/@[0-9].*//')
  if ! grep -q "\"$base_name\"" package.json 2>/dev/null; then
    MISSING_EXPO+=("$pkg")
  else
    ok "Już zainstalowany: $base_name"
  fi
done

# Instaluj brakujące
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
  info "Instaluję: ${MISSING_PACKAGES[*]}"
  if [ "$USE_EXPO" = true ]; then
    npx expo install "${MISSING_PACKAGES[@]}"
  else
    $INSTALL_CMD "${MISSING_PACKAGES[@]}"
  fi
  ok "Zainstalowano pakiety npm"
else
  ok "Wszystkie pakiety npm już zainstalowane"
fi

if [ ${#MISSING_EXPO[@]} -gt 0 ]; then
  info "Instaluję pakiety Expo: ${MISSING_EXPO[*]}"
  if [ "$USE_EXPO" = true ]; then
    npx expo install "${MISSING_EXPO[@]}"
  else
    $INSTALL_CMD "${MISSING_EXPO[@]}"
  fi
  ok "Zainstalowano pakiety Expo"
else
  ok "Wszystkie pakiety Expo już zainstalowane"
fi

# ─── Patch app.json ─────────────────────────────────────────
sep
echo -e "${BOLD}  Sprawdzanie app.json...${RESET}"
sep

APP_JSON="$PROJECT_DIR/app.json"
if [ -f "$APP_JSON" ]; then
  if grep -q "expo-barcode-scanner" "$APP_JSON" 2>/dev/null; then
    ok "app.json — expo-barcode-scanner już skonfigurowany"
  else
    warn "app.json — dodaj ręcznie plugin expo-barcode-scanner (patrz CLINE_IMPLEMENTATION_GUIDE.md Faza 0.2)"
  fi
else
  warn "Brak app.json — pomiń lub utwórz ręcznie"
fi

# ─── Sprawdź app.json / _layout.tsx dla fontów ──────────────
FONT_FILES=$(find "$SRC_DIR" -name "_layout.tsx" -o -name "App.tsx" 2>/dev/null | head -1)
if [ -n "$FONT_FILES" ]; then
  if grep -q "DMSans" "$FONT_FILES" 2>/dev/null; then
    ok "Fonty DM Sans już załadowane w: $FONT_FILES"
  else
    warn "Dodaj ładowanie fontów do: $FONT_FILES (patrz Faza 0.3 w guide)"
  fi
fi

# ─── Podsumowanie ────────────────────────────────────────────
sep
echo ""
echo -e "${GREEN}${BOLD}  ✅ INSTALACJA ZAKOŃCZONA!${RESET}"
echo ""
echo -e "${BOLD}  Skopiowane pliki:${RESET}"
echo "  src/theme/         → colors.ts, tokens.ts, index.ts"
echo "  src/components/    → ui.tsx, AddEntryModal.tsx, BulkEntryModal.tsx"
echo "  src/screens/       → 6 ekranów"
echo "  CLINE_IMPLEMENTATION_GUIDE.md → główna instrukcja"
echo ""
echo -e "${BOLD}  Następne kroki:${RESET}"
echo ""
echo -e "  ${ORANGE}1.${RESET} Otwórz Cline w VS Code"
echo -e "  ${ORANGE}2.${RESET} Załącz plik: ${BOLD}CLINE_IMPLEMENTATION_GUIDE.md${RESET}"
echo -e "  ${ORANGE}3.${RESET} Wpisz do Cline:"
echo ""
echo -e "  ${BLUE}\"Przejrzyj CLINE_IMPLEMENTATION_GUIDE.md."
echo -e "   Pliki theme/, components/, screens/ już skopiowane."
echo -e "   Zacznij od Fazy 0.3 (fonty) i idź po kolei."
echo -e "   Zintegruj z istniejącymi hooks Supabase.\"${RESET}"
echo ""
if [ ${#MISSING_PACKAGES[@]} -gt 0 ] || [ ${#MISSING_EXPO[@]} -gt 0 ]; then
  echo -e "  ${ORANGE}4.${RESET} Uruchom: ${BOLD}npx expo start${RESET}"
else
  echo -e "  ${ORANGE}4.${RESET} Uruchom: ${BOLD}npx expo start${RESET}"
fi
echo ""
sep
echo ""
