# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

- **Conexión Atlassian distribuida por el plugin.** `.mcp.json` declara el servidor `atlassian`
  contra el Rovo MCP oficial (`https://mcp.atlassian.com/v2/mcp`, transporte HTTP, sin headers
  ni variables de entorno): quien instala el plugin recibe la misma conexión que todo el equipo
  y sólo autentica con `/mcp` → Authenticate usando su cuenta corporativa. OAuth con Dynamic
  Client Registration lo resuelve Claude Code; el repositorio no contiene ninguna credencial y
  no existe token compartido ni fallback a uno. Verificado end-to-end el 2026-09-10 sobre Jira,
  Confluence y Bitbucket — evidencia, nombres reales de tools y modos de fallo en
  `docs/atlassian-mcp.md` (nuevo).
- **Bitbucket queda cubierto por el MCP.** El endpoint v2 expone `bitbucket: read-write` y ~18
  operaciones (repos, PRs, branches, commits, pipelines, deployments). Esto **corrige la
  conclusión previa** de que Atlassian no llegaba a Bitbucket: aquella prueba fue contra el
  endpoint v1 del conector personal `claude_ai_Atlassian`. Ya no hace falta el API token con
  Basic Auth que se había usado como salida puntual.
- `scripts/validar-plugin.mjs` cruza los nombres de tools MCP declarados en el frontmatter de
  `agents/*.md` contra `config/klap.yaml` → `mcp.atlassian.server`. El frontmatter es la única
  excepción a "nunca hardcodees un nombre de servidor MCP" (se evalúa antes de que el agente
  pueda leer la config), así que el chequeo evita que un rename deje `disallowedTools` apuntando
  a un servidor inexistente — un permiso muerto que reabriría escritura en un agente de sólo
  lectura sin romper nada visible.

### Fixed

- **`.mcp.json` deja de depender de la máquina de una persona.** La entrada `klap-knowledge`
  apuntaba a `C:\klap-workspace\klap-dev-kit-knowledge\.venv\Scripts\python.exe`: una ruta
  absoluta, además de Windows-only, que hacía fallar ese servidor en el equipo de cualquier otro
  dev. Ahora se resuelve con `${KLAP_KNOWLEDGE_PYTHON:-python}` y `${KLAP_KNOWLEDGE_HOME}`
  (documentado en `docs/installation.md`, paso 4). Si faltan, falla **sólo** ese servidor: el
  mock y Atlassian siguen conectados. `scripts/validar-plugin.mjs` ahora rechaza cualquier ruta
  absoluta en `.mcp.json`, para que el problema no pueda reaparecer.

### Changed

- `config/klap.yaml` → `mcp.atlassian`: `server` pasa de `claude_ai_Atlassian` (conector
  personal, endpoint v1, sin Bitbucket) a `plugin_klap_atlassian`, el servidor del plugin.
  Se agregan `endpoint`, `auth` y `productos`. `schemas/klap-config.schema.json` exige `auth` y
  lo restringe a `oauth` — un enum de un solo valor a propósito: abrirlo a tokens debe ser un
  cambio explícito y revisable, no un descuido.
- Mínimo privilegio: `analista`, `arquitecto`, `seguridad` y `certificador` pasan a negar
  explícitamente las tools de escritura de Atlassian (`executeWrite`, `executeDestructive` y las
  primarias de creación/edición de Jira y Confluence). `documentador` y `documentador-klap`
  conservan escritura porque la necesitan para Confluence.
- Los agentes y `skills/trabajar-hu` ahora distinguen **MCP no autenticado** de **MCP conectado
  sin permisos**, y advierten que una búsqueda JQL vacía puede ser falta de acceso, no ausencia
  de datos — Jira devuelve `issues: []` sin error en ese caso.

- Contrato Klap Knowledge MCP `2.3.0`: nueva operación `upsert_component` en
  `aplicar_patch_memoria` para crear/actualizar `memory/components/<id>.yaml` — hasta ahora
  `upsert_component_link` no tenía forma de que ese archivo llegara a existir, así que ningún
  producto podía terminar con `technical.components` poblado. Klap Knowledge pasa a ser la
  única fuente de verdad de los componentes; `component.yaml` por repo se elimina del kit (ver
  entrada de `Removed` más abajo). Nuevo valor `"repo"` en `source_ref.type`
  (`"component-yaml"` queda deprecado, se retira en `3.0.0`). Ver
  `docs/contrato-v2.3-propuesta.md` en `klap-dev-kit-knowledge`.
- Gate de producto por Épica Jira en fase 1 de `/klap:trabajar-hu`: nueva tool
  `producto_por_epica` (contrato Klap Knowledge MCP `2.1.0`, aditiva y retrocompatible) que
  resuelve determinísticamente el producto de una HU contra `sources.yaml`, con
  `buscar_producto` como respaldo heurístico. Si ningún producto existe, la fase se detiene y
  dispara `/klap:memoria-inicializar` con su pausa humana obligatoria — el análisis nunca
  avanza sin memoria de producto resuelta (`agents/documentador-klap.md`, nuevo Flujo 0).
- El Flujo A (alta inicial) de `documentador-klap` ahora pregunta siempre épica(s) Jira y
  espacio(s) Confluence del producto, y su patch incluye `upsert_source_state` de forma
  obligatoria — antes el alta no dejaba registrado el cursor que el gate necesita para
  encontrar el producto la próxima vez.
- `scripts/memoria-git.mjs`: deja cada `aplicar_patch_memoria` aplicado en una rama
  `producto/<product_id>` del checkout de `klap-dev-kit-knowledge`
  (`config/klap.yaml` → `memoria.repo_path`) con PR hacia `main` — el merge sigue siendo
  siempre humano, nunca automático.

### Removed

- `component.yaml` por repo: eliminado por completo (schema, template, script de validación
  `validar-component.mjs` → `validar-contexto.mjs`, hook de validación, y toda referencia en
  agentes/skills/standards/docs). Un archivo por repo no se mantenía actualizado y su exigencia
  bloqueaba todo enlace producto-componente en Klap Knowledge. `docs/context/index.yaml` (memoria
  técnica del repo) no se ve afectado — es un concepto distinto.

## [0.1.0] - 2026-08-26

### Added

- Estructura inicial del plugin (`.claude-plugin/plugin.json`, `marketplace.json`).
- Workflow `/klap:trabajar-hu` (8 fases: contexto, análisis, diseño, implementación,
  validación, certificación, documentación, finalización) y skills complementarios
  (`analizar`, `disenar`, `desarrollar`, `certificar`, `documentar`,
  `actualizar-componente`, `consultar-estandar`).
- Siete agentes especializados: `analista`, `arquitecto`, `desarrollador`, `certificador`,
  `seguridad`, `documentador`, `documentador-klap` (memoria organizacional de producto en Klap
  Knowledge, separada de la memoria técnica del repo que mantiene `documentador`).
- Contrato de Klap Knowledge MCP v2.0.0 (`schemas/knowledge-mcp/tools.json`, 10 tools) y
  servidor mock local (`mocks/klap-knowledge-mcp/`) para desarrollar y testear el kit
  desacoplado del servicio real. v2 agrega memoria estructurada de producto
  (`obtener_producto`, `historial_producto`, `estado_fuentes`) y la única vía real de
  escritura, `aplicar_patch_memoria` (patch estructurado con evidencia); `targeted_sync` queda
  deprecada (acuse degradado, eliminación real prevista para `3.0.0`).
- Skills `memoria-inicializar`, `memoria-actualizar` y `memoria-consultar` para gestionar la
  memoria de producto en Klap Knowledge fuera de `/klap:trabajar-hu` (que ahora invoca
  `documentador-klap` en su fase 8 de Finalización).
- Validaciones deterministas (`scripts/*.mjs`) y hooks bloqueantes (`hooks/hooks.json`):
  escaneo de secretos en commit, certificación en verde antes de push, validación de
  memoria de componente tras cada escritura.
- `standards/` inicial (núcleo redactado + stubs migrados de `eco-team-brain`, marcados
  `estado: requiere-revision` pendientes de validación por el equipo).
- Plantillas (`templates/`), documentación humana (`docs/`) y suite de tests del propio kit.

### Pendiente para 1.0.0

- Completar los 2 estándares que siguen en `estado: requiere-revision` en
  `standards/index.yaml` — son esqueletos sin contenido confirmado por el equipo, no
  contenido migrado pendiente de revisión (eso ya se cerró en Etapa 2):
  `standards/infraestructura/aws-serverless.md` y `standards/arquitectura/ddd-avanzado.md`.
- Reemplazar `klap-knowledge-local-mock` por el servicio real de Klap Knowledge cuando esté
  disponible (cambiar `config/klap.yaml` → `mcp.knowledge.modo: produccion`), verificando
  `contractVersion` en `schemas/knowledge-mcp/tools.json` contra lo que el servicio real
  implemente.
- Confirmar nombre de servidor MCP de SonarQube una vez esté desplegado.
- Mutation testing: el gate ya existe (`config/quality-gates.yaml` → `mutacion.minimo_score`,
  `scripts/quality-gate.mjs`). `minimo_score` (60%) es un umbral interino **aceptado**
  (decisión 2026-08-28) — recalibrarlo contra un repo real queda pospuesto a una etapa/ronda
  futura, no bloquea nada mientras tanto.
- `claude plugin eval`: 6 casos semilla escritos (`analista`, `arquitecto`, `seguridad`,
  3 de `documentador-klap`) pero nunca ejecutados — bloqueado por early access de Anthropic a
  nivel de organización, no por código del kit. Solicitud ya enviada a la cuenta rep
  (2026-08-28), sin ETA. **Pendiente indefinido, no bloqueante** por decisión explícita del
  usuario — ver `docs/claude-plugin-eval.md`.
- 2 casos de `documentador-klap` sin escribir aún (no bloqueantes, cubrir cuando se retome
  `evals/`): historial idempotente (procesar dos veces la misma HU no debe crear dos eventos
  duplicados) y actualizaciones rutinarias con autoaplicación (un issue Jira cerrado con fuente
  inequívoca no debe generar una pregunta al humano).
- Piloto de `documentador-klap` sobre 2-3 productos reales (no bloqueante para 1.0.0): antes de
  generalizar `/klap:memoria-inicializar` a todo el catálogo, evaluar en casos reales cantidad
  de preguntas al humano, calidad de la memoria de negocio inferida, precisión de relaciones y
  componentes detectados, tamaño de los deltas Jira/Confluence por actualización, utilidad
  real durante el análisis de una HU, y frecuencia de conflictos Git en la memoria compartida.
