#!/usr/bin/env sh
# Builds ../David_Mwiti_Interactive_Portfolio.zip with only the publishable site, then integrity-checks it.
set -eu
cd "$(dirname "$0")"
OUT="$(cd .. && pwd)/David_Mwiti_Interactive_Portfolio.zip"
FILES="index.html projects style.css guide.css guide.js server wrangler.toml .assetsignore .dev.vars.example app.js project.js enhancements.js artifacts.js notebook.js nav.js David_Mwiti_CV.pdf README.md HANDOFF.md LOCAL_START.sh"

rm -f "$OUT"
zip -qr "$OUT" $FILES -x '*.DS_Store'

CHECK="$(mktemp -d)"
trap 'rm -rf "$CHECK"' EXIT
unzip -q "$OUT" -d "$CHECK"
for f in $FILES; do [ -e "$CHECK/$f" ] || { echo "missing in zip: $f"; exit 1; }; done
for f in "$CHECK"/*.js; do node --check "$f"; done
if [ -f tests/.forbidden-terms ]; then
  if grep -rliF -f tests/.forbidden-terms "$CHECK"; then echo "confidential term found in zip"; exit 1; fi
else
  echo "tests/.forbidden-terms missing: cannot verify confidentiality"; exit 1
fi
if grep -rl 'studyanchor.org/admin' "$CHECK"; then echo "/admin link found"; exit 1; fi
echo "ok: $OUT ($(unzip -l "$OUT" | tail -1 | awk '{print $2}') files)"
