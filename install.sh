#!/usr/bin/env bash
#
# Installe l'extension GNOME Shell « Dense App Grid ».
#
#   ./install.sh            installe (ou met à jour) et active l'extension
#   ./install.sh --uninstall  désinstalle
#
set -euo pipefail

UUID="dense-app-grid@ben-j.github.io"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/${UUID}"
DEST_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

log()  { printf '\033[1;34m::\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

uninstall() {
    gnome-extensions disable "${UUID}" 2>/dev/null || true

    # Retire aussi l'UUID de la liste GSettings : `disable` échoue si le Shell
    # ne connaît pas encore l'extension (installée sans reconnexion).
    python3 - "${UUID}" <<'PY'
import subprocess, sys, ast
uuid = sys.argv[1]
cur = subprocess.check_output(
    ['gsettings', 'get', 'org.gnome.shell', 'enabled-extensions'], text=True).strip()
items = ast.literal_eval(cur.replace('@as ', '')) if cur not in ('@as []', '[]') else []
if uuid in items:
    items = [i for i in items if i != uuid]
    value = '[' + ', '.join(f"'{i}'" for i in items) + ']' if items else '@as []'
    subprocess.check_call(['gsettings', 'set', 'org.gnome.shell', 'enabled-extensions', value])
PY

    rm -rf "${DEST_DIR}" "${HOME}/.cache/${UUID}"
    log "Extension désinstallée."
    warn "Déconnectez-vous puis reconnectez-vous pour finaliser (Wayland)."
    exit 0
}

[[ "${1:-}" == "--uninstall" ]] && uninstall

# --- Vérifications -----------------------------------------------------------

command -v gnome-extensions >/dev/null 2>&1 \
    || die "'gnome-extensions' introuvable. Installez le paquet gnome-shell."
command -v glib-compile-schemas >/dev/null 2>&1 \
    || die "'glib-compile-schemas' introuvable. Installez glib2-devel (Fedora) ou libglib2.0-dev (Debian/Ubuntu)."

[[ -d "${SRC_DIR}" ]] || die "Dossier source introuvable : ${SRC_DIR}"

SHELL_VERSION="$(gnome-shell --version | awk '{print $3}')"
SHELL_MAJOR="${SHELL_VERSION%%.*}"
log "GNOME Shell détecté : ${SHELL_VERSION} (session ${XDG_SESSION_TYPE:-inconnue})"

if [[ "${SHELL_MAJOR}" != "50" ]]; then
    warn "Cette extension cible GNOME Shell 50 ; vous utilisez ${SHELL_VERSION}."
    warn "L'installation continue, mais l'extension peut être refusée par le Shell."
fi

# --- Installation ------------------------------------------------------------

log "Installation dans ${DEST_DIR}"
rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}"
cp -r "${SRC_DIR}/." "${DEST_DIR}/"

log "Compilation du schéma GSettings"
glib-compile-schemas "${DEST_DIR}/schemas"

# --- Activation --------------------------------------------------------------

gsettings set org.gnome.shell disable-user-extensions false

if gnome-extensions list 2>/dev/null | grep -qx "${UUID}"; then
    gnome-extensions enable "${UUID}"
    log "Extension activée."
else
    # GNOME Shell ne scanne le dossier des extensions qu'au démarrage : une
    # extension fraîchement copiée lui est inconnue, et sous Wayland il est
    # impossible de recharger le Shell. On l'inscrit donc directement dans la
    # liste des extensions activées pour qu'elle démarre à la reconnexion.
    if ! gsettings get org.gnome.shell enabled-extensions | grep -q "'${UUID}'"; then
        python3 - "${UUID}" <<'PY'
import subprocess, sys, ast
uuid = sys.argv[1]
cur = subprocess.check_output(
    ['gsettings', 'get', 'org.gnome.shell', 'enabled-extensions'], text=True).strip()
items = ast.literal_eval(cur.replace('@as ', '')) if cur not in ('@as []', '[]') else []
items.append(uuid)
value = '[' + ', '.join(f"'{i}'" for i in items) + ']'
subprocess.check_call(['gsettings', 'set', 'org.gnome.shell', 'enabled-extensions', value])
PY
    fi
    log "Extension pré-activée."
    warn "GNOME Shell ne détecte les nouvelles extensions qu'au démarrage de la session."
    warn "Déconnectez-vous puis reconnectez-vous : elle sera active automatiquement."
fi

cat <<EOF

Terminé.

  Réglages   : gnome-extensions prefs ${UUID}
  État       : gnome-extensions info ${UUID}
  Journal    : journalctl -f -o cat /usr/bin/gnome-shell
  Désinstall.: ./install.sh --uninstall

EOF
