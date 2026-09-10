#!/bin/sh
# Bootstrap de klap-dev-kit: NO instala el plugin (eso lo hace el marketplace nativo
# de Claude Code, /plugin marketplace add + /plugin install). Sólo verifica
# prerequisitos y deja instrucciones para las herramientas de certificación.
# POSIX sh, compatible con bash.

set -eu

fail=0

echo "== klap-dev-kit bootstrap =="

if command -v node >/dev/null 2>&1; then
  node_version=$(node --version | sed 's/^v//')
  node_major=$(echo "$node_version" | cut -d. -f1)
  if [ "$node_major" -lt 18 ]; then
    echo "[FALTA] node $node_version encontrado, pero se requiere >= 18."
    fail=1
  else
    echo "[OK] node $node_version"
  fi
else
  echo "[FALTA] node no está en PATH. Instala Node.js >= 18: https://nodejs.org"
  fail=1
fi

if command -v git >/dev/null 2>&1; then
  echo "[OK] $(git --version)"
else
  echo "[FALTA] git no está en PATH."
  fail=1
fi

if command -v trivy >/dev/null 2>&1; then
  echo "[OK] $(trivy --version | head -n 1)"
else
  echo "[OPCIONAL] trivy no está en PATH. Necesario para /klap:certificar (escaneo de dependencias)."
  echo "           Instalación: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
fi

if command -v dependency-check.sh >/dev/null 2>&1 || command -v dependency-check >/dev/null 2>&1; then
  echo "[OK] OWASP Dependency-Check disponible"
else
  echo "[OPCIONAL] OWASP Dependency-Check no está en PATH. Necesario para /klap:certificar."
  echo "           Instalación: https://jeremylong.github.io/DependencyCheck/dependency-check-cli/"
fi

echo ""
echo "== Conexiones del plugin =="
if command -v node >/dev/null 2>&1; then
  # Reusa el mismo verificador que corre el hook SessionStart: una sola fuente de verdad sobre
  # qué variables hacen falta (config/klap.yaml -> mcp.*.requiere_env).
  salida=$(node "$(dirname "$0")/../scripts/verificar-conexiones.mjs") || true
  if [ -n "$salida" ]; then
    echo "$salida"
  else
    echo "[OK] Todas las variables KLAP_* necesarias están definidas."
  fi
fi

echo ""
echo "== Instalación del plugin =="
echo "1. /plugin marketplace add <url-del-repo-klap-dev-kit>"
echo "2. /plugin install klap@klap-dev-kit"
echo "3. Para actualizar: /plugin update klap@klap-dev-kit"

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Hay prerequisitos obligatorios faltantes. Resuélvelos antes de usar el plugin."
  exit 1
fi

exit 0
