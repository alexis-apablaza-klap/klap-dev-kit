# Conexión Atlassian (Jira, Confluence, Bitbucket)

El plugin declara el servidor Atlassian en su propio `.mcp.json`, así que **la conexión llega
con el plugin**: es idéntica para todo el equipo y nadie configura endpoints, transportes ni
credenciales. Lo único personal es *quién* se autentica.

```json
"atlassian": {
  "type": "http",
  "url": "https://mcp.atlassian.com/v2/mcp"
}
```

Sin `headers`, sin `env`, sin bloque `oauth`: Claude Code descubre el authorization server y
hace Dynamic Client Registration solo. **El repositorio no contiene ninguna credencial**, y los
tokens quedan en el almacén de credenciales del SO que gestiona Claude Code — nunca en un
archivo del repo ni en la config del plugin.

## Onboarding — una vez por persona

1. Instala el plugin (`/plugin install klap@klap-dev-kit`).
2. Ejecuta `/mcp`.
3. Elige **`atlassian`** — el que aparece bajo el plugin, no el conector `claude.ai Atlassian`,
   que es distinto (ver más abajo).
4. **Authenticate** → completa OAuth en el navegador con tu cuenta corporativa Klap.
5. Verifica con `claude mcp list`: `plugin:klap:atlassian … ✔ Connected`.

La autenticación es **personal e intransferible**. No se crean ni se comparten API tokens para
uso normal, y lo que cada persona puede leer o escribir son exactamente sus permisos reales en
Jira, Confluence y Bitbucket.

> Si al volver del navegador aparece `Invalid context provided. Please try authorizing again`,
> revisa igualmente `claude mcp list` antes de reintentar: en la verificación de 2026-09-10 ese
> mensaje apareció **y aun así la autenticación se había completado** correctamente.

### El MCP no autentica Git

Son dos cosas separadas y ninguna reemplaza a la otra:

| | Para qué sirve | Cómo se autentica |
|---|---|---|
| MCP Atlassian | Leer/escribir Jira, Confluence y las **APIs** de Bitbucket | OAuth personal vía `/mcp` |
| Git CLI | `clone`, `fetch`, `pull`, `push` | Config Git personal, preferentemente SSH |

El plugin no gestiona, almacena ni distribuye credenciales Git ni claves SSH, y el token OAuth
del MCP no sirve para autenticar Git.

---

## Verificación de 2026-09-10 (evidencia)

Sesión real contra el endpoint v2, cuenta `alexis.apablaza@klap.cl`. Todo lo de abajo se
transcribió de la sesión; nada está inferido.

### Productos accesibles

`getAccessibleAtlassianResources` → cloudId `db4dd528-0e0b-4bdf-b3dd-1e2e4e792a43`:

| Producto | Acceso |
|---|---|
| jira | read-write |
| confluence | read-write |
| **bitbucket** | **read-write** |
| code-search | read-only |
| goals, projects, loom, talent, teams, focus | read-write |

### Bitbucket **sí** está cubierto por v2 — corrige una conclusión previa

`.klap/knowledge/abono-ya/proposal.md` (2026-09-09) concluyó que Atlassian no llegaba a
Bitbucket: `fetch` con un ARI de Bitbucket devolvía `Unsupported product: bitbucket`, y hubo
que recurrir a un API token con Basic Auth contra `api.bitbucket.org`.

**Esa conclusión aplica al endpoint `/v1/mcp`** — el que usa el conector gestionado
`claude.ai Atlassian` — **no al `/v2/mcp`** que declara este plugin. Con v2, y sólo con OAuth:

```
executeRead listBitbucketRepositories { workspaceId: "multicaja-cloud", q: 'name ~ "sva-anticipo"' }
→ size: 9
```

Los mismos 9 repos que ayer exigieron un API token. **El API token ya no hace falta**, y el
workspace `multicaja-cloud` está correctamente vinculado a la Atlassian Organization.

### Nombres reales de las tools

Namespacing observado: **`mcp__plugin_klap_atlassian__<tool>`** (el servidor aparece como
`plugin:klap:atlassian` en `claude mcp list`).

**Primarias, ya en la lista de tools** — 21:

| Lectura | Escritura |
|---|---|
| `getJiraIssue`, `searchJiraIssuesUsingJql` | `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addOrEditJiraIssueComment` |
| `getConfluenceContent`, `searchConfluence` | `createConfluenceContent`, `updateConfluenceContent` |
| `search`, `discover`, `executeRead` | `executeWrite`, `executeDestructive` |
| `getAccessibleAtlassianResources`, `atlassianUserInfo` | `addTeamworkGraphContext` |
| `getTeamworkGraphContext`, `getTeamworkGraphObject`, `getLoomVideo` | |

**Catálogo completo: 255 operaciones** (181 buscables) sobre Jira, Confluence, Compass,
Bitbucket, Focus, Goals, Projects, Loom, Talent y Teams. No son tools individuales: se
descubren con `discover` y se ejecutan con la tool del nivel de riesgo que corresponda —
`executeRead` (lectura), `executeWrite` (crea/actualiza), `executeDestructive` (borra o es
irreversible). Llamar al nivel equivocado es rechazado por el servidor.

Esa separación en tres niveles **es** el punto de control de mínimo privilegio: negar
`executeWrite`/`executeDestructive` a un agente de sólo lectura basta para cerrarle toda la
escritura del catálogo, sin enumerar operación por operación.

Operaciones Bitbucket confirmadas en el catálogo (muestra): `listBitbucketWorkspaces`,
`getBitbucketWorkspace`, `listBitbucketRepositories`, `getBitbucketRepository`,
`listBitbucketRepoPullRequests`, `listBitbucketRepoPullRequestComments`,
`listBitbucketRepoPullRequestTasks`, `getBitbucketRepoBranch`, `getBitbucketRepoCommit`,
`getBitbucketRepoFileContent`, `listBitbucketRepoPipelines`, `listBitbucketRepoPipelineSteps`,
`listBitbucketRepoDeployments`, `listBitbucketRepoEnvironments`,
`listBitbucketRepoCommitReports`, `getBitbucketRepoDefaultReviewers`,
`createBitbucketRepoBranch`, `createBitbucketRepoCommit`.

Nota: las operaciones de Bitbucket **ignoran `cloudId`** y se scopean por `workspaceId`.

### Cómo distinguir los modos de fallo

**MCP no autenticado** — `claude mcp list` muestra `! Needs authentication`, y en sesión el
servidor expone *sólo* `authenticate` / `complete_authentication`, ninguna tool real. Respuesta
correcta: declararlo explícitamente en el artefacto de la fase, seguir con lo disponible
(memoria del repo, Klap Knowledge) y **nunca inventar contexto**; indicar al usuario que corra
`/mcp` y autentique con su cuenta corporativa.

**MCP conectado, sin permisos** — la conexión funciona y el error viene del recurso. Mensaje
literal obtenido al pedir un workspace ajeno (`getBitbucketWorkspace` sobre `atlassian`):

```
Your Bitbucket workspace must be linked to an Atlassian organization to use MCP tools.
Please ask your organization admin to link this workspace.
```

Respuesta correcta: decir que la conexión está bien y que **es un tema de permisos de la
persona o de configuración del workspace**; no reintentar con otra identidad ni buscar una
credencial alternativa.

> **Trampa — Jira no falla, devuelve vacío.** `searchJiraIssuesUsingJql` sobre un proyecto
> inexistente o sin acceso responde `issues: []` con `isLast: true`, **sin error**. Un resultado
> vacío de JQL no prueba que no haya nada: puede ser falta de permisos. Nunca lo reportes como
> "no existe" sin verificar el proyecto por otra vía.

### Formato de `.mcp.json`: plano, sin envoltorio `mcpServers`

Ambos formatos se probaron en sesión:

| Formato | Resultado |
|---|---|
| Plano (servidores en la raíz) — **el que usamos** | Los 3 servidores cargan como `plugin:klap:*`. Único costo: `[Failed to parse] Project config` en los diagnósticos, visible **sólo** al trabajar dentro de este repo, nunca para quien instala el plugin |
| Con `{"mcpServers": {…}}` | El archivo se interpreta *además* como project config: aparecen **los 3 servidores duplicados** en `⏸ Pending approval` y `${CLAUDE_PLUGIN_ROOT}` queda sin resolver |

El envoltorio es el formato correcto para un `.mcp.json` **de proyecto**; para uno **de plugin**
duplica servidores. No lo agregues.

---

## Las dos validaciones que necesitan una segunda persona

Todo lo anterior se verificó con una sola cuenta. Quedan dos comprobaciones que por definición no
puede hacer un solo dev.

### 1. Instalación limpia — parcialmente cerrada (2026-09-10)

Un segundo dev instaló el plugin y **funcionó de entrada**: `atlassian` aparece en `/mcp` y el
OAuth completa con la cuenta corporativa, sin configurar endpoints ni credenciales. Eso confirma
la mitad positiva.

**Lo que sigue abierto es la mitad negativa** — que *antes* de autenticar no haya acceso — porque
sólo se puede observar en la ventana previa al primer Authenticate, y esa ventana ya se cerró para
ese dev. Se cierra con el próximo que instale.

Las cuatro comprobaciones para el próximo dev, en orden de valor:

1. **Antes de darle Authenticate:** que `claude mcp list` muestre `atlassian` sin conectar y que
   una lectura de Jira falle. (Se puede recuperar con `/mcp` → logout.)
2. **El aviso de conexiones al iniciar sesión:** el hook `SessionStart` debería listar las
   variables `KLAP_*` que le faltan (`KLAP_KNOWLEDGE_HOME`, `KLAP_SONARQUBE_TOKEN`) con dónde
   obtenerlas. Es la **primera ejecución de `scripts/verificar-conexiones.mjs` en una máquina que
   no es la de quien lo escribió**; si no aparece nada, o aparece incompleto, es un bug real de
   onboarding.
3. **El mismo `cloudId`** que devuelve `getAccessibleAtlassianResources`
   (`db4dd528-0e0b-4bdf-b3dd-1e2e4e792a43`).
4. **Si aparece `Invalid context provided`** y la autenticación igual quedó completa. Una segunda
   observación confirma que es cosmético y no una condición de carrera.

### 2. Aislamiento entre identidades — abierta

Que dos devs autenticados vean cada uno sólo los recursos que sus permisos de Atlassian les
permiten.

**Cómo diseñarla, porque el modo de fallo y el resultado esperado se ven idénticos:** un JQL
vacío puede ser "no hay nada" o "no tienes permisos" (ver la trampa documentada más arriba). Una
prueba que sólo mire un resultado vacío **no falsea nada**. Sirve únicamente un **par
positivo/negativo** sobre un recurso cuya visibilidad se verificó antes en la consola de
Atlassian: un proyecto Jira o espacio Confluence que una persona ve y la otra no, comprobando que
cada una obtiene la respuesta que le corresponde.

Si al hacerlas aparece algo distinto de lo documentado aquí, corregir este archivo con la
evidencia nueva.

## Hallazgos de la verificación — todos resueltos

Se registran cerrados, no borrados: son las razones por las que el kit quedó como quedó.

1. **`.mcp.json` → `klap-knowledge` tenía rutas absolutas de una máquina concreta**, además
   Windows-only. Ahora invoca `scripts/klap-knowledge-launch.mjs`, que deriva el intérprete de
   `${KLAP_KNOWLEDGE_HOME}` (configuración en `docs/installation.md`, paso 4), y
   `scripts/validar-plugin.mjs` rechaza cualquier ruta absoluta en `.mcp.json` para que no vuelva
   a colarse.
2. **`config/klap.yaml` → `hosting` describía mal la realidad**: decía `proveedor_actual: github`
   con `migracion_planificada: bitbucket`, lo que hacía leer Bitbucket como futuro cuando ya es
   el presente de todos los repos de producto (`git@bitbucket.org:multicaja-cloud/…`). Ahora el
   bloque declara los dos hostings que coexisten —`dev_kit` en GitHub, `productos` en Bitbucket
   Cloud— en vez de una migración a medias.
3. **`config/klap.yaml` apuntaba al conector personal `claude_ai_Atlassian`** (endpoint v1, sin
   Bitbucket). Ahora es `plugin_klap_atlassian`, con `endpoint`, `auth: oauth` y `productos`
   declarados; el schema exige `auth` y `validar-plugin.mjs` verifica que los nombres de tools
   MCP del frontmatter de los agentes sigan coincidiendo con ese valor.
4. **`marketplace.json` no tenía `description`**, así que `claude plugin validate --strict`
   fallaba. Ese validador oficial no corre en CI, de modo que el hueco sólo aparecía al
   validarlo a mano; `validar-plugin.mjs` ahora exige los campos mínimos de ambos manifests.
