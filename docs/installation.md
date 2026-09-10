# Instalación

Klap Dev-Kit se distribuye como plugin de Claude Code vía un marketplace git privado. No hay
que clonar ni compilar nada manualmente para usarlo dentro de Claude Code.

## 1. Agregar el marketplace (una vez por máquina)

```
/plugin marketplace add https://github.com/alexis-apablaza-klap/klap-dev-kit.git
```

## 2. Instalar el plugin

```
/plugin install klap@klap-dev-kit
```

Esto registra los 11 comandos `/klap:*`, los 7 agentes, los hooks de validación y **las cinco
conexiones MCP** del kit (Atlassian, Context7, SonarQube, Klap Knowledge y su mock). Los
endpoints llegan configurados; sólo faltan las credenciales personales de los pasos 3 a 5.

## 3. Autenticar Atlassian (una vez por persona)

El plugin trae declarado el servidor Atlassian —el mismo endpoint para todo el equipo—, pero la
identidad es tuya:

```
/mcp
```

Elige **`atlassian`** (el del plugin, no el conector `claude.ai Atlassian`) → **Authenticate** →
completa OAuth con tu cuenta corporativa Klap. Verifica con `claude mcp list` que quede
`plugin:klap:atlassian … ✔ Connected`.

Sin este paso, Jira, Confluence y Bitbucket no están disponibles y las fases que los usan lo
declaran explícitamente. No se comparten ni se crean API tokens: cada quien usa su cuenta, y ve
exactamente lo que sus permisos en Atlassian le permiten. Detalle, modos de fallo y evidencia de
la verificación: `docs/atlassian-mcp.md`.

## 4. Token de SonarQube

Necesario para `/klap:certificar`. Es la única conexión del kit que pide un token en vez de
OAuth: el MCP oficial de SonarSource no ofrece otra cosa.

1. Genera un token en **https://sonarcloud.io/account/access-tokens**.
2. Guárdalo como variable de **usuario** (persiste entre sesiones):

```
Windows    setx KLAP_SONARQUBE_TOKEN "tu-token"     (abre una terminal nueva después)
Linux/Mac  export KLAP_SONARQUBE_TOKEN="tu-token"   en ~/.bashrc o ~/.zshrc
```

3. Reinicia Claude Code y confirma con `claude mcp list` que `plugin:klap:sonarqube` diga
   `✔ Connected`.

Sin el token, `/klap:certificar` **no se bloquea**: certifica igual pero advierte que no pudo
verificar el Quality Gate. Detalle en `docs/conexiones.md`.

## 5. Klap Knowledge en modo producción (opcional)

El plugin trae el **mock** de Klap Knowledge, que se activa solo y basta para probar el flujo
completo. Para apuntar al **servicio real** hace falta tener clonado e instalado el repo
`klap-dev-kit-knowledge` (privado, separado) y declarar dos variables de entorno — el plugin no
puede saber dónde lo clonaste ni qué intérprete de Python usas:

| Variable | Qué es | Default |
|---|---|---|
| `KLAP_KNOWLEDGE_HOME` | Ruta al checkout de `klap-dev-kit-knowledge` | — (obligatoria) |
| `KLAP_KNOWLEDGE_PYTHON` | Intérprete con el paquete instalado, normalmente el del venv | `python` |

La forma recomendada es el bloque `env` de tu `settings.json` de Claude Code:

```json
{
  "env": {
    "KLAP_KNOWLEDGE_HOME": "/ruta/a/klap-dev-kit-knowledge",
    "KLAP_KNOWLEDGE_PYTHON": "/ruta/a/klap-dev-kit-knowledge/.venv/bin/python"
  }
}
```

En Windows el intérprete del venv es `…\.venv\Scripts\python.exe`.

Si no las defines, `plugin:klap:klap-knowledge` aparece como `✘ Failed to connect` en
`claude mcp list` — **sólo ese servidor**; el mock y el resto de las conexiones siguen
funcionando, y las fases que usan Klap Knowledge lo declaran en vez de inventar contexto.

No tienes que acordarte de nada de esto: si falta alguna variable `KLAP_*`, el kit te lo avisa
al iniciar la sesión, con el impacto y dónde obtener la credencial. Tabla completa de las cinco
conexiones: `docs/conexiones.md`.

## 6. Actualizar

```
/plugin update klap@klap-dev-kit
```

Como `plugin.json` declara una `version` explícita (SemVer), sólo se actualiza cuando se
publica una nueva versión — no en cada push al repo.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js ≥ 18 (los scripts y hooks del kit son `.mjs` puros de Node).
- Git.
- Cuenta corporativa Atlassian (paso 3) y token de SonarCloud (paso 4). Los servidores MCP los
  trae el plugin; lo que pones tú es la identidad. Si alguna conexión no está disponible, las
  fases que la usan lo declaran explícitamente en vez de fallar en silencio. Tabla completa:
  `docs/conexiones.md`.
- Para certificación completa en el propio repo de trabajo: el wrapper de build del proyecto
  (`gradlew`/`mvnw`/`npm`), y opcionalmente Trivy / OWASP Dependency-Check para el escaneo de
  dependencias (`scripts/deps-scan.mjs` detecta si no están instalados y lo informa, no falla
  en silencio).

## Bootstrap (opcional)

`bootstrap/install.ps1` (Windows) e `install.sh` (Linux/Mac) verifican prerequisitos (Node,
Git, Trivy, OWASP Dependency-Check) y, si falta alguno de los dos últimos, indican dónde
instalarlo — no lo instalan automáticamente. No reemplazan el paso 1-2 de arriba — el plugin en
sí se instala siempre por el mecanismo nativo de Claude Code, nunca por un CLI propio.

## Verificar la instalación

Escribe `/klap:` en el prompt y deberían listarse los 11 skills (ver `docs/commands.md`).

Si además tienes el repo del kit clonado localmente (desarrollo/contribución, no instalación
normal vía marketplace), `claude plugin validate --strict <ruta-al-repo>` valida el manifest y
`npm run validate` (desde la raíz del repo) verifica coherencia estructural completa.
