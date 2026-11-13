#!/usr/bin/env bash
# Downloads Godot 4.7 (headless-capable Linux build) and only the web export template.
# Runs as the "crown" user. Both downloads are checked against the SHA-512 sums Godot
# published for 4.7-stable (pinned below), so a corrupted or tampered file is rejected.
set -euo pipefail

BASE="${CROWN_BASE:-/srv/crown}"
export HOME="${CROWN_HOME:-$BASE/home}"
TOOLS="$BASE/src/tools"
TMP="$BASE/src/tmp"
VERSION="4.7-stable"
URL="https://github.com/godotengine/godot/releases/download/$VERSION"
EDITOR_ZIP="Godot_v4.7-stable_linux.x86_64.zip"
EDITOR_SHA512="b639ca9c1ddea39bb3df89bd5283a51ca6047467abe6b25e9436566f2b2082ede633025073989ecf39c7d5d3c2493d80ea13e3af6dd5e261bbf89e462d6d2214"
TEMPLATES_TPZ="Godot_v4.7-stable_export_templates.tpz"
TEMPLATES_SHA512="1035dfde4edcc2472bb0c0b9610ce3ee9302642c2b9957e9066372f9f6bb759ab250c8887551a66f0bc5f51bbd9a58bb45e33a0f29844e97615a9b1138c1120e"
TEMPLATE_DIR="$HOME/.local/share/godot/export_templates/4.7.stable"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
[[ "$(id -un)" == "root" ]] && { log "run as the crown user, not root"; exit 1; }
mkdir -p "$TOOLS" "$TMP" "$TEMPLATE_DIR"

fetch() {  # fetch <file> <sha512> -> $TMP/<file>, verified
  local file="$1" sum="$2"
  if [[ -f "$TMP/$file" ]] && echo "$sum  $TMP/$file" | sha512sum -c --quiet - 2>/dev/null; then
    return 0
  fi
  log "downloading $file"
  curl -fL --retry 3 -o "$TMP/$file" "$URL/$file"
  echo "$sum  $TMP/$file" | sha512sum -c --quiet - || { rm -f "$TMP/$file"; log "checksum mismatch: $file"; exit 1; }
}

if [[ ! -x "$TOOLS/godot" ]]; then
  fetch "$EDITOR_ZIP" "$EDITOR_SHA512"
  unzip -o -q "$TMP/$EDITOR_ZIP" -d "$TOOLS"
  mv "$TOOLS/Godot_v4.7-stable_linux.x86_64" "$TOOLS/godot"
  chmod 755 "$TOOLS/godot"
  rm -f "$TMP/$EDITOR_ZIP"
  log "Godot installed: $("$TOOLS/godot" --headless --version 2>/dev/null | tail -n1)"
fi

if [[ ! -f "$TEMPLATE_DIR/web_nothreads_release.zip" ]]; then
  # The full template archive is 1.2 GB; only the 10 MB single-threaded web template is kept.
  fetch "$TEMPLATES_TPZ" "$TEMPLATES_SHA512"
  unzip -o -q -j "$TMP/$TEMPLATES_TPZ" "templates/web_nothreads_release.zip" "templates/version.txt" \
    -d "$TEMPLATE_DIR"
  rm -f "$TMP/$TEMPLATES_TPZ"
  log "web export template installed in $TEMPLATE_DIR"
fi
log "done"
