#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
warn() { printf "\n\033[1;33m! %s\033[0m\n" "$*"; }

step "Checking prerequisites"
command -v node >/dev/null || { echo "Need Node.js"; exit 1; }
command -v npm  >/dev/null || { echo "Need npm";     exit 1; }
echo "node $(node -v)"
echo "npm  $(npm -v)"
if command -v watchman >/dev/null; then echo "watchman $(watchman -v)"; else warn "watchman not found (optional, recommended on macOS)"; fi

step "Installing JS dependencies"
npm install

step "Generating native projects (expo prebuild)"
npx expo prebuild --no-install

step "Installing CocoaPods (iOS)"
if [[ "$(uname)" == "Darwin" ]] && [[ -d ios ]]; then
  if command -v pod >/dev/null; then
    (cd ios && pod install)
  else
    warn "CocoaPods not installed. Run: sudo gem install cocoapods"
  fi
else
  warn "Skipping pod install (not macOS or no ios/ directory)"
fi

step "Typechecking"
npm run typecheck || warn "typecheck reported issues"

step "Done"
cat <<'EOF'

Next:
  - iOS:     npm run ios -- --device
  - Android: npm run android -- --device
  - Tests:   npm test

NFC needs a real device. Simulators / emulators do not have NFC hardware.
EOF
