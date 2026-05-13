#!/usr/bin/env bash
# Encode mobile/GoogleService-Info.plist and mobile/google-services.json to
# base64 for pasting into GitHub Secrets (GOOGLE_SERVICES_PLIST_B64,
# GOOGLE_SERVICES_JSON_B64). Used by the materialize step in the three mobile
# workflows under .github/workflows/.
#
# Usage:
#   scripts/encode-firebase-config.sh           # print both values to stdout
#   scripts/encode-firebase-config.sh --copy    # macOS only: pipe each value
#                                                 to pbcopy, one at a time,
#                                                 pausing for you to paste.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST="$REPO_ROOT/mobile/GoogleService-Info.plist"
JSON="$REPO_ROOT/mobile/google-services.json"

for f in "$PLIST" "$JSON"; do
  if [ ! -f "$f" ]; then
    echo "error: $f not found." >&2
    echo "Obtain the real Firebase config files from your team and place them at:" >&2
    echo "  mobile/GoogleService-Info.plist" >&2
    echo "  mobile/google-services.json" >&2
    exit 1
  fi
done

# `base64 < file` is portable across BSD (macOS) and GNU (Linux). The output
# is line-wrapped at 76 chars on macOS by default; GitHub Secrets accept
# multi-line values verbatim and `base64 -d` skips whitespace during decode,
# so the wrapping is fine — no need to strip newlines.
PLIST_B64="$(base64 < "$PLIST")"
JSON_B64="$(base64 < "$JSON")"

print_section() {
  local label="$1" value="$2"
  printf '\n# %s\n' "$label"
  printf '# Paste the block below as the value of this GitHub Secret.\n'
  printf '# Repo → Settings → Secrets and variables → Actions → New secret\n'
  printf -- '----------------------------------------------------------------------\n'
  printf '%s\n' "$value"
  printf -- '----------------------------------------------------------------------\n'
}

if [ "${1:-}" = "--copy" ]; then
  if ! command -v pbcopy >/dev/null 2>&1; then
    echo "error: --copy requires pbcopy (macOS only)." >&2
    exit 1
  fi
  printf '%s' "$PLIST_B64" | pbcopy
  echo "GOOGLE_SERVICES_PLIST_B64 copied to clipboard. Paste it into GH Secrets, then press Enter for the next one."
  read -r _
  printf '%s' "$JSON_B64" | pbcopy
  echo "GOOGLE_SERVICES_JSON_B64 copied to clipboard. Paste it into GH Secrets."
else
  print_section "GOOGLE_SERVICES_PLIST_B64" "$PLIST_B64"
  print_section "GOOGLE_SERVICES_JSON_B64"  "$JSON_B64"
fi
