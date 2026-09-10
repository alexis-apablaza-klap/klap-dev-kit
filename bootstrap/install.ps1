# Bootstrap de klap-dev-kit: NO instala el plugin (eso lo hace el marketplace nativo
# de Claude Code, /plugin marketplace add + /plugin install). Sólo verifica
# prerequisitos y deja instrucciones para las herramientas de certificación.
# Compatible con Windows PowerShell 5.1 (sin &&/||, sin ternario).

$ErrorActionPreference = "Stop"
$falla = $false

Write-Host "== klap-dev-kit bootstrap =="

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVersionRaw = (& node --version).TrimStart("v")
    $nodeMajor = [int]($nodeVersionRaw.Split(".")[0])
    if ($nodeMajor -lt 18) {
        Write-Host "[FALTA] node $nodeVersionRaw encontrado, pero se requiere >= 18."
        $falla = $true
    } else {
        Write-Host "[OK] node $nodeVersionRaw"
    }
} else {
    Write-Host "[FALTA] node no esta en PATH. Instala Node.js >= 18: https://nodejs.org"
    $falla = $true
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    Write-Host "[OK] $(& git --version)"
} else {
    Write-Host "[FALTA] git no esta en PATH."
    $falla = $true
}

$trivyCmd = Get-Command trivy -ErrorAction SilentlyContinue
if ($trivyCmd) {
    Write-Host "[OK] trivy disponible"
} else {
    Write-Host "[OPCIONAL] trivy no esta en PATH. Necesario para /klap:certificar (escaneo de dependencias)."
    Write-Host "           Instalacion: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"
}

$dcCmd = Get-Command dependency-check.bat -ErrorAction SilentlyContinue
if (-not $dcCmd) {
    $dcCmd = Get-Command dependency-check -ErrorAction SilentlyContinue
}
if ($dcCmd) {
    Write-Host "[OK] OWASP Dependency-Check disponible"
} else {
    Write-Host "[OPCIONAL] OWASP Dependency-Check no esta en PATH. Necesario para /klap:certificar."
    Write-Host "           Instalacion: https://jeremylong.github.io/DependencyCheck/dependency-check-cli/"
}

Write-Host ""
Write-Host "== Conexiones del plugin =="
if (Get-Command node -ErrorAction SilentlyContinue) {
    # Mismo verificador que corre el hook SessionStart: una sola fuente de verdad sobre qué
    # variables hacen falta (config/klap.yaml -> mcp.*.requiere_env).
    $verificador = Join-Path $PSScriptRoot "..\scripts\verificar-conexiones.mjs"
    $salida = & node $verificador | Out-String
    if ($salida.Trim()) { Write-Host $salida.Trim() }
    else { Write-Host "[OK] Todas las variables KLAP_* necesarias estan definidas." }
}

Write-Host ""
Write-Host "== Instalacion del plugin =="
Write-Host "1. /plugin marketplace add <url-del-repo-klap-dev-kit>"
Write-Host "2. /plugin install klap@klap-dev-kit"
Write-Host "3. Para actualizar: /plugin update klap@klap-dev-kit"

if ($falla) {
    Write-Host ""
    Write-Host "Hay prerequisitos obligatorios faltantes. Resuelvelos antes de usar el plugin."
    exit 1
}

exit 0
