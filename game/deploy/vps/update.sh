#!/usr/bin/env bash
# Ashen Crown web build updater. Runs as the "crown" user (systemd timer or by hand).
#
#   update.sh               fetch the branch; build and publish only if the code changed
#   update.sh --force       build and publish even if nothing changed, and even when busy
#   update.sh --from-tar F  build from a source tarball instead of git (GitHub fallback)
#   update.sh --rollback    put the previous published build back
#
# Publishing is two renames: www -> www-prev, www-next -> www. The live site is never half
# written, and the previous build stays for --rollback.
set -euo pipefail
umask 022

BASE="${CROWN_BASE:-/srv/crown}"
CONF="$BASE/crown.conf"
SRC="$BASE/src"
REPO="$SRC/repo"
BUILD="$SRC/build"
GODOT="$SRC/tools/godot"
export HOME="${CROWN_HOME:-$BASE/home}"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

[[ -f "$CONF" ]] || die "missing $CONF"
# shellcheck source=/dev/null
source "$CONF"
: "${REPO_URL:?}" "${BRANCH:?}" "${PROJECT_SUBDIR:=game}" "${MAX_LOAD:=2.5}"
: "${BUSY_FILE:=}" "${BUSY_CMD:=}" "${SMOKE_TEST:=yes}"

[[ "$(id -un)" == "root" ]] && die "run as the crown user, not root"

MODE="normal"
TARBALL=""
case "${1:-}" in
  "") ;;
  --force) MODE="force" ;;
  --from-tar) MODE="tar"; TARBALL="${2:?usage: update.sh --from-tar file.tar.gz}" ;;
  --rollback) MODE="rollback" ;;
  *) die "unknown option $1" ;;
esac

# One run at a time.
exec 9>"$SRC/.update.lock"
flock -n 9 || { log "another update is running; skipping"; exit 0; }

if [[ "$MODE" == "rollback" ]]; then
  [[ -d "$BASE/www-prev" ]] || die "no previous build to roll back to"
  mv "$BASE/www" "$BASE/www-swap"
  mv "$BASE/www-prev" "$BASE/www"
  mv "$BASE/www-swap" "$BASE/www-prev"
  log "rolled back to: $(cat "$BASE/www/version.txt" 2>/dev/null || echo unknown)"
  exit 0
fi

busy() {
  local load
  load="$(cut -d' ' -f1 /proc/loadavg)"
  if awk -v l="$load" -v m="$MAX_LOAD" 'BEGIN { exit !(l > m) }'; then
    log "load $load is above $MAX_LOAD"; return 0
  fi
  if [[ -n "$BUSY_FILE" && -e "$BUSY_FILE" ]]; then
    log "busy file $BUSY_FILE exists"; return 0
  fi
  if [[ -n "$BUSY_CMD" ]] && bash -c "$BUSY_CMD" >/dev/null 2>&1; then
    log "busy check reports busy"; return 0
  fi
  return 1
}

if [[ "$MODE" == "normal" ]] && busy; then
  log "machine is busy; skipping this run"
  exit 0
fi

[[ -x "$GODOT" ]] || die "Godot not found at $GODOT (run fetch-godot.sh)"

# --- get the source --------------------------------------------------------------------
if [[ "$MODE" == "tar" ]]; then
  [[ -f "$TARBALL" ]] || die "no such file: $TARBALL"
  rm -rf "$SRC/tar-src" && mkdir -p "$SRC/tar-src"
  tar -xzf "$TARBALL" -C "$SRC/tar-src" --no-same-owner
  PROJECT="$(dirname "$(find "$SRC/tar-src" -maxdepth 3 -name project.godot | head -n1)")"
  [[ -f "$PROJECT/project.godot" ]] || die "no project.godot inside $TARBALL"
  REV="tar:$(sha256sum "$TARBALL" | cut -c1-12)"
else
  if [[ ! -d "$REPO/.git" ]]; then
    log "cloning $REPO_URL ($BRANCH)"
    git clone --quiet --depth 20 --branch "$BRANCH" "$REPO_URL" "$REPO" \
      || die "git clone failed (is the deploy key added to the GitHub repository?)"
  fi
  git -C "$REPO" fetch --quiet --depth 20 origin "$BRANCH" || die "git fetch failed"
  REV="$(git -C "$REPO" rev-parse FETCH_HEAD)"
  if [[ "$MODE" == "normal" && -f "$SRC/built.rev" && "$(cat "$SRC/built.rev")" == "$REV" ]]; then
    exit 0  # nothing new (the common case: under a second)
  fi
  git -C "$REPO" checkout --quiet --force --detach "$REV"
  git -C "$REPO" clean --quiet -fdx -e .godot
  PROJECT="$REPO/$PROJECT_SUBDIR"
fi
log "building $REV"

# --- build -------------------------------------------------------------------------------
run_godot() { nice -n 19 ionice -c3 timeout "$1" "$GODOT" --headless --path "$PROJECT" "${@:2}"; }

rm -rf "$BUILD" && mkdir -p "$BUILD"
run_godot 15m --import >"$SRC/last-import.log" 2>&1 \
  || die "import failed (see $SRC/last-import.log)"
if [[ "$SMOKE_TEST" == "yes" ]]; then
  # A few seconds of the real game with the test bot; any script error stops the release.
  run_godot 3m --quit-after 240 -- --autopilot >"$SRC/last-smoke.log" 2>&1 || true
  if grep -qE "SCRIPT ERROR|Parse Error|Compile Error" "$SRC/last-smoke.log"; then
    die "the new code has script errors; keeping the current build (see $SRC/last-smoke.log)"
  fi
fi
run_godot 15m --export-release Web "$BUILD/index.html" >"$SRC/last-export.log" 2>&1 \
  || die "export failed (see $SRC/last-export.log)"
for f in index.html index.js index.wasm index.pck; do
  [[ -s "$BUILD/$f" ]] || die "export is missing $f (see $SRC/last-export.log)"
done
printf '%s\n%s\n' "$REV" "$(date -u '+%FT%TZ')" >"$BUILD/version.txt"
# Compress once here (nginx gzip_static serves the .gz), not on every download: the wasm is ~40 MB.
for f in "$BUILD"/*.wasm "$BUILD"/*.pck "$BUILD"/*.js "$BUILD"/*.html; do
  if [[ -f "$f" ]]; then nice -n 19 ionice -c3 gzip -9 -k -n -f "$f"; fi  # (an if, not &&: set -e)
done

# --- publish -------------------------------------------------------------------------------
rm -rf "$BASE/www-next"
cp -r "$BUILD" "$BASE/www-next"
chmod -R u=rwX,go=rX "$BASE/www-next"
rm -rf "$BASE/www-prev"
if [[ -d "$BASE/www" ]]; then
  mv "$BASE/www" "$BASE/www-prev"
fi
mv "$BASE/www-next" "$BASE/www"
echo "$REV" >"$SRC/built.rev"
log "published $REV"
