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

Esto registra los 11 comandos `/klap:*`, los 7 agentes, los hooks de validación, el servidor
MCP mock de Klap Knowledge y **el servidor MCP de Atlassian** (se activan solos, sin
configuración adicional).

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

## 4. Klap Knowledge en modo producción (opcional)

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
`claude mcp list` — **sólo ese servidor**; el mock y Atlassian siguen funcionando, y las fases
que usan Klap Knowledge lo declaran en vez de inventar contexto.

## 5. Actualizar

```
/plugin update klap@klap-dev-kit
```

Como `plugin.json` declara una `version` explícita (SemVer), sólo se actualiza cuando se
publica una nueva versión — no en cada push al repo.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js ≥ 18 (los scripts y hooks del kit son `.mjs` puros de Node).
- Git.
- Cuenta corporativa Atlassian, autenticada según el paso 3 — el MCP de Atlassian
  (Jira/Confluence/Bitbucket) lo trae el plugin, no hay que conseguirlo aparte. SonarQube
  (`/klap:certificar`) sigue dependiendo de que esté conectado en tu sesión. Si alguno no está
  disponible, esas fases lo declaran explícitamente en vez de fallar en silencio.
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
