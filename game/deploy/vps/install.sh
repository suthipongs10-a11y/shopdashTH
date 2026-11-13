#!/usr/bin/env bash
# One-time setup of the Ashen Crown web build on eggpact-dev (Ubuntu 24.04), run with sudo:
#
#   sudo ./install.sh
#
# Safe to run again (e.g. after adding the Cloudflare origin certificate). What it does:
#   1. installs nginx (curl, unzip, git, ufw are checked too)
#   2. creates the system user "crown" and /srv/crown/{home,src,bin,www}; crown cannot read
#      /home/eggbound and nginx can only read /srv/crown/www
#   3. creates a read-only GitHub deploy key for crown (you add the public key on GitHub)
#   4. downloads Godot 4.7 + the web export template as crown (SHA-512 checked)
#   5. sets up nginx: crown.ragalpha.com from /srv/crown/www only, unknown hosts refused,
#      real visitor IPs from Cloudflare (enabled once the origin certificate is in place)
#   6. firewall (ufw): SSH stays open; 80/443 only from Cloudflare (asks before enabling)
#   7. a systemd timer that runs the updater as crown every hour, except 05:xx, with limited
#      CPU (1 core), memory (1.5 GB) and lowest priority
set -euo pipefail

DOMAIN="crown.ragalpha.com"
CROWN_USER="crown"
BASE="/srv/crown"
CERT_DIR="/etc/ssl/crown"
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EGGPACT_HOME="/home/eggbound"
# GitHub's published SSH host key (ed25519), pinned so the first connection cannot be spoofed.
GITHUB_HOSTKEY="github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"

say() { printf '\n== %s\n' "$*"; }
warn() { printf '!! %s\n' "$*"; }
[[ $EUID -eq 0 ]] || { echo "run with sudo: sudo $0"; exit 1; }
TODO=()

# --- 1. packages ----------------------------------------------------------------------------
say "1. packages"
missing=()
for pkg in nginx curl unzip git ufw; do
  dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
done
if ((${#missing[@]})); then
  apt-get update -q
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${missing[@]}"
fi
echo "ok: nginx curl unzip git ufw"

# --- 2. user and folders ----------------------------------------------------------------------
say "2. user $CROWN_USER and $BASE"
if ! id "$CROWN_USER" >/dev/null 2>&1; then
  useradd --system --user-group --home-dir "$BASE/home" --shell /bin/bash "$CROWN_USER"
  echo "created user $CROWN_USER (no password, no SSH login)"
fi
install -d -o "$CROWN_USER" -g "$CROWN_USER" -m 0711 "$BASE"
install -d -o "$CROWN_USER" -g "$CROWN_USER" -m 0700 "$BASE/home" "$BASE/src"
install -d -o root -g root -m 0755 "$BASE/bin"
install -o root -g root -m 0755 "$KIT/update.sh" "$KIT/fetch-godot.sh" "$BASE/bin/"
if [[ ! -f "$BASE/crown.conf" ]]; then
  install -o root -g "$CROWN_USER" -m 0640 "$KIT/crown.conf.example" "$BASE/crown.conf"
fi
if [[ ! -d "$BASE/www" ]]; then
  install -d -o "$CROWN_USER" -g "$CROWN_USER" -m 0755 "$BASE/www"
  printf '<!doctype html><meta charset="utf-8"><title>Ashen Crown</title><p>กำลังเตรียมเกม ลองใหม่อีกครั้งในไม่กี่นาที</p>\n' \
    >"$BASE/www/index.html"
  chown "$CROWN_USER:$CROWN_USER" "$BASE/www/index.html"
fi
if sudo -u "$CROWN_USER" test -r "$EGGPACT_HOME" 2>/dev/null; then
  warn "$CROWN_USER can read $EGGPACT_HOME - fix its permissions (e.g. chmod 750 $EGGPACT_HOME)"
  TODO+=("Make $EGGPACT_HOME unreadable for $CROWN_USER (chmod 750), then run install.sh again")
else
  echo "ok: $CROWN_USER cannot read $EGGPACT_HOME"
fi

# --- 3. read-only deploy key ------------------------------------------------------------------
say "3. GitHub deploy key"
SSH_DIR="$BASE/home/.ssh"
install -d -o "$CROWN_USER" -g "$CROWN_USER" -m 0700 "$SSH_DIR"
if [[ ! -f "$SSH_DIR/crown_deploy" ]]; then
  sudo -u "$CROWN_USER" ssh-keygen -q -t ed25519 -N "" -C "crown-deploy@eggpact-dev" \
    -f "$SSH_DIR/crown_deploy"
fi
cat >"$SSH_DIR/config" <<CFG
Host github-crown
    HostName github.com
    User git
    IdentityFile $SSH_DIR/crown_deploy
    IdentitiesOnly yes
    HostKeyAlgorithms ssh-ed25519
    StrictHostKeyChecking yes
CFG
echo "$GITHUB_HOSTKEY" >"$SSH_DIR/known_hosts"
chown "$CROWN_USER:$CROWN_USER" "$SSH_DIR/config" "$SSH_DIR/known_hosts"
chmod 0600 "$SSH_DIR/config" "$SSH_DIR/known_hosts"
DEPLOY_PUB="$(cat "$SSH_DIR/crown_deploy.pub")"
if sudo -u "$CROWN_USER" -H git ls-remote "git@github-crown:suthipongs10-a11y/shopdashTH.git" HEAD \
    >/dev/null 2>&1; then
  echo "ok: the deploy key can read the repository"
else
  TODO+=("Add this READ-ONLY deploy key on GitHub (repository suthipongs10-a11y/shopdashTH ->
     Settings -> Deploy keys -> Add deploy key, leave 'Allow write access' unticked):
     $DEPLOY_PUB")
fi

# --- 4. Godot -----------------------------------------------------------------------------------
say "4. Godot 4.7 + web export template (as $CROWN_USER)"
sudo -u "$CROWN_USER" -H env CROWN_BASE="$BASE" nice -n 19 "$BASE/bin/fetch-godot.sh"

# --- 5. nginx -----------------------------------------------------------------------------------
say "5. nginx"
cf_list() {  # cf_list v4|v6: Cloudflare ranges, fetched live with a built-in fallback
  local fam="$1" got
  got="$(curl -fsS --max-time 10 "https://www.cloudflare.com/ips-$fam" 2>/dev/null || true)"
  if [[ "$fam" == v4 ]]; then
    got="$(grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}/[0-9]{1,2}$' <<<"$got" || true)"
    [[ -n "$got" ]] || got="173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22
141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22
198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22"
  else
    got="$(grep -E '^[0-9a-f:]+/[0-9]{1,3}$' <<<"$got" || true)"
    [[ -n "$got" ]] || got="2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32
2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32"
  fi
  tr ' ' '\n' <<<"$got" | sed '/^$/d'
}
CF_RANGES="$(cf_list v4; cf_list v6)"
{
  echo "# Generated by install.sh: real visitor IPs behind Cloudflare."
  while read -r net; do echo "set_real_ip_from $net;"; done <<<"$CF_RANGES"
  echo "real_ip_header CF-Connecting-IP;"
} >/etc/nginx/snippets/cloudflare-realip.conf
install -m 0644 "$KIT/nginx/00-deny-unknown.conf" /etc/nginx/conf.d/00-deny-unknown.conf
install -m 0644 "$KIT/nginx/crown.conf" /etc/nginx/sites-available/crown.conf
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm /etc/nginx/sites-enabled/default   # the stock "Welcome to nginx" page
fi
install -d -m 0700 "$CERT_DIR"
if [[ -s "$CERT_DIR/origin.pem" && -s "$CERT_DIR/origin.key" ]]; then
  chmod 0644 "$CERT_DIR/origin.pem"; chmod 0600 "$CERT_DIR/origin.key"
  ln -sf /etc/nginx/sites-available/crown.conf /etc/nginx/sites-enabled/crown.conf
  echo "ok: origin certificate found, site enabled"
else
  rm -f /etc/nginx/sites-enabled/crown.conf
  TODO+=("Create a Cloudflare Origin Certificate for $DOMAIN (Cloudflare -> ragalpha.com -> SSL/TLS ->
     Origin Server -> Create Certificate), save it as $CERT_DIR/origin.pem and the private key as
     $CERT_DIR/origin.key, set SSL/TLS mode to Full (strict), then run install.sh again")
fi
nginx -t
systemctl enable --quiet nginx
systemctl reload nginx 2>/dev/null || systemctl restart nginx

# --- 6. firewall --------------------------------------------------------------------------------
say "6. firewall (ufw)"
SSH_PORTS="$(sshd -T 2>/dev/null | awk '$1 == "port" {print $2}' | sort -u)"
[[ -n "$SSH_PORTS" ]] || SSH_PORTS="22"
echo "SSH port(s) that stay open to everyone: $(tr '\n' ' ' <<<"$SSH_PORTS")"
echo "80 and 443 will accept Cloudflare only. Everything else inbound is blocked."
echo "Ports listening on this machine right now (not localhost):"
ss -Hltn | awk '{print $4}' | grep -vE '^(127\.|\[::1\])' | sort -u | sed 's/^/   /'
if ufw status | grep -q "Status: active"; then
  echo "ufw is already active; adding the rules only"
  ANSWER="yes"
elif [[ "${CONFIRM_FIREWALL:-}" == "yes" ]]; then
  ANSWER="yes"
else
  read -r -p "Enable the firewall with these rules? Type yes to continue: " ANSWER || ANSWER=""
fi
if [[ "$ANSWER" == "yes" ]]; then
  while read -r port; do ufw allow "$port/tcp" comment "SSH" >/dev/null; done <<<"$SSH_PORTS"
  while read -r net; do
    ufw allow proto tcp from "$net" to any port 80,443 comment "Cloudflare" >/dev/null
  done <<<"$CF_RANGES"
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw --force enable >/dev/null
  ufw status | head -n 6
else
  TODO+=("Firewall not enabled: run 'sudo CONFIRM_FIREWALL=yes ./install.sh' when ready")
fi

# --- 7. updater timer -----------------------------------------------------------------------------
say "7. hourly updater"
install -m 0644 "$KIT/systemd/crown-update.service" "$KIT/systemd/crown-update.timer" \
  /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now --quiet crown-update.timer
systemctl list-timers crown-update.timer --no-pager | head -n 2

# --- summary ----------------------------------------------------------------------------------------
say "done"
if ((${#TODO[@]})); then
  echo "Still to do:"
  for item in "${TODO[@]}"; do echo " - $item"; done
fi
cat <<MSG

First build (about 3-6 minutes):  sudo systemctl start crown-update.service
Watch it:                         journalctl -u crown-update.service -f
DNS (Cloudflare): A record "crown" -> 157.85.101.245, proxied (orange cloud).
Then open https://$DOMAIN
MSG
