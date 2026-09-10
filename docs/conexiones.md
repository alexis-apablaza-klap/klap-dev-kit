# Conexiones del kit

El plugin declara **todos** sus servidores MCP en su propio `.mcp.json`, así que llegan con la
instalación: nadie configura endpoints ni transportes, y todo el equipo usa la misma conexión.
Lo que sí es personal es la identidad — quién se autentica y con qué credencial.

| Conexión | Qué trae el plugin | Qué pones tú | Si falta |
|---|---|---|---|
| **atlassian** | Endpoint Rovo MCP v2 | OAuth vía `/mcp` (una vez) | Fase 1 se detiene: sin Jira no hay HU |
| **context7** | Endpoint público | **Nada** | Fase 3 usa documentación oficial como respaldo |
| **sonarqube** | Endpoint SonarCloud + org | `KLAP_SONARQUBE_TOKEN` | `/klap:certificar` aprueba **con advertencia**, sin verificar el Quality Gate |
| **klap-knowledge** | Launcher Node que deriva el intérprete del checkout | `KLAP_KNOWLEDGE_HOME` | Fases 1 y 8 degradan; `/klap:memoria-inicializar` se detiene |
| **klap-knowledge-local-mock** | Servidor mock completo | Nada | — (es el respaldo para probar el flujo) |

No hace falta memorizar esta tabla: si falta una variable, el kit **te avisa solo** al iniciar la
sesión (`scripts/verificar-conexiones.mjs` vía hook `SessionStart`). Si está todo configurado, no
dice nada.

## Convención de variables

Toda variable de entorno que el plugin necesita empieza con **`KLAP_`**. Es deliberado: deja
claro de un vistazo qué variables de tu máquina existen por este plugin y cuáles no tienen nada
que ver con él.

Defínelas como **variables de usuario**, no de sesión, para que persistan:

```
Windows    setx KLAP_SONARQUBE_TOKEN "tu-token"     (abre una terminal nueva después)
Linux/Mac  export KLAP_SONARQUBE_TOKEN="tu-token"   en ~/.bashrc o ~/.zshrc
```

También sirve el bloque `env` de tu `settings.json` de Claude Code:

```json
{
  "env": {
    "KLAP_SONARQUBE_TOKEN": "tu-token",
    "KLAP_KNOWLEDGE_HOME": "/ruta/a/klap-dev-kit-knowledge"
  }
}
```

Ninguna de estas variables se guarda en el repositorio, en `.mcp.json` ni en la configuración del
plugin: los archivos compartidos sólo contienen la **referencia** `${KLAP_…}`.

---

## Atlassian — Jira, Confluence y Bitbucket

OAuth personal, sin tokens. Todo el detalle —onboarding, evidencia de la verificación, nombres
reales de las tools y modos de fallo— está en [`atlassian-mcp.md`](atlassian-mcp.md).

## Context7 — documentación de librerías en vivo

No requiere nada: endpoint público, sin credencial ni configuración. Lo usa el agente
`arquitecto` (fase 3) para verificar el comportamiento real de una librería o framework en la
versión instalada, en vez de confiar en guías estáticas que caducan con cada release.

Context7 ofrece una API key opcional para subir los rate limits. El kit no la usa; si alguna vez
hiciera falta, sería una variable `KLAP_` más.

## SonarQube — métricas de calidad

Es la **única conexión del kit que no usa OAuth**: el MCP oficial de SonarSource sólo admite
token de usuario.

1. Genera un token en **https://sonarcloud.io/account/access-tokens**.
2. Guárdalo como `KLAP_SONARQUBE_TOKEN` (variable de usuario, ver arriba).
3. Reinicia Claude Code y comprueba con `claude mcp list` que `plugin:klap:sonarqube` aparezca
   `✔ Connected`.

El servidor se declara con `SONARQUBE_READ_ONLY: "true"`: el `certificador` sólo lee métricas y
no puede cambiar el estado de un issue en Sonar.

> **El análisis no se corre en local.** Los proyectos Klap se publican en SonarCloud al ejecutar
> el pipeline de **Jenkins** del repo (desa o qa). El kit sólo *lee* métricas ya publicadas. Por
> eso un proyecto sin corrida reciente no devuelve métricas aunque tu token sea perfectamente
> válido — y por eso la advertencia de `/klap:certificar` menciona las dos causas posibles.

### Qué pasa si falta el token

`/klap:certificar` **no se bloquea**: certifica igual, pero con una advertencia explícita de que
el Quality Gate no se verificó. Antes esa dimensión aprobaba en silencio, que era peor: el
veredicto decía "aprobado" sin que nadie hubiera mirado Sonar.

El `certificador` tiene instrucción de **omitir** el bloque `sonar` del reporte cuando no hay
datos, nunca de rellenarlo con ceros: un cero inventado se leería como "verificado y sin
hallazgos".

## Klap Knowledge — memoria organizacional

Requiere el repo `klap-dev-kit-knowledge` clonado e instalado (es privado y separado). Pasos y
variables: [`installation.md`](installation.md), paso 4.

Mientras no lo configures, el plugin usa el **mock** incluido, que basta para probar el flujo
completo sin el servicio real.

---

## Notas de implementación

- **`.mcp.json` va sin envoltorio `mcpServers`.** Con el envoltorio, el archivo se interpreta
  además como configuración de proyecto y los servidores aparecen duplicados. Ver
  [`atlassian-mcp.md`](atlassian-mcp.md).
- **`${VAR}` se expande dentro de `headers`**, verificado en sesión. Cuando la variable no existe,
  Claude Code deja el literal `${VAR}` en vez de avisar — el fallo llega como un 403 opaco. Esa
  opacidad es la razón de ser de `scripts/verificar-conexiones.mjs`.
- **Fijar `headers.Authorization` desactiva el fallback OAuth** de ese servidor (lo dice el propio
  mensaje de error de Claude Code). Es correcto para SonarQube, que no ofrece OAuth; por eso
  Atlassian no lleva `headers`.
- `scripts/validar-plugin.mjs` rechaza rutas absolutas en `.mcp.json` y verifica que los nombres
  de tools MCP en el frontmatter de los agentes coincidan con `config/klap.yaml`.
