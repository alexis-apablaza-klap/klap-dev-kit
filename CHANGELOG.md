# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [0.1.1-alpha] - 2026-09-10

### Added

- **El productor de documentos existe.** `agents/documentador-klap.md` emite, por cada página de
  Confluence que lee, un `upsert_document` (`document_id: "confluence:<id>"`, con `topics` que
  alimentan la `razon` de `documentos_relevantes`) y el cursor correspondiente en
  `upsert_source_state → confluence.pages`. Antes `grep -rn "upsert_document" agents/ skills/`
  devolvía cero: lo leído quedaba en el artefacto local (gitignored) y la pasada siguiente releía
  el espacio completo. Documentadas las dos asimetrías que se pagan al equivocarse:
  `upsert_document` **reemplaza** la fila (no mergea, al revés que `upsert_component`), y
  documento y cursor van juntos o el delta-sync no converge.
- `skills/memoria-inicializar` y `skills/memoria-actualizar` exigen ambas operaciones en el flujo,
  igual que ya exigían `upsert_source_state` para las épicas.

### Changed

- **Contrato Klap Knowledge MCP `2.3.0` → `2.4.0`** (aditivo, retrocompatible). Espeja en
  `schemas/knowledge-mcp/tools.json` las tres operaciones de baja del servicio
  (`remove_identity_alias`, `remove_component_dependency`, `remove_component`), el
  `incluir_deprecados` de `resumen_producto`, el `status` de `resumen_componente` y de cada
  resultado de `buscar`, el tipo `evento` en `buscar.tipos`, y `operaciones_sin_efecto` en la
  salida de `aplicar_patch_memoria`. `config/klap.yaml → contratos.knowledge_mcp` acompaña. La
  versión del plugin no se mueve por el contrato: son ejes aparte (ver README).
- **El mock local alcanza al contrato 2.4.0**: `resumen_producto` omite los deprecados salvo
  `incluir_deprecados`, `resumen_componente` y `buscar` declaran `status`, y las bajas reflejan el
  archivo borrado en `changed_files`. No emite `operaciones_sin_efecto`: el mock no tiene el
  contenido de la memoria, así que no puede saber si había algo que borrar — declararlo vacío
  afirmaría que sí lo sabe. Un agente desarrollado contra el mock ahora ve las mismas superficies
  que contra el servicio real.

### Fixed

- El mock reportaba `products/<id>/documents.yaml` en `changed_files`: esa ruta **nunca existió**,
  la memoria real usa `documents.ndjson`.
- El fixture de componentes del mock declaraba `mc_tlog` como id de dependencia, imposible bajo
  `^[a-z0-9][a-z0-9-]*$` — es `mc-tlog`, exactamente la normalización que el propio agente
  documenta.

## [0.1.0-alpha] - 2026-09-10

Primera versión con tag del plugin. Arranca el versionado formal: `plugin.json` y `package.json`
declaran la misma cadena y `scripts/validar-plugin.mjs` lo verifica. La entrada histórica del
2026-08-26, que numeraba el cierre de Etapa 1, quedó renumerada como `0.0.1`.

### Added

- **Versionado formal del plugin.** `plugin.json` y `package.json` declaran la misma cadena y
  `scripts/validar-plugin.mjs` cruza ambas contra una entrada del CHANGELOG — antes derivaban en
  silencio (`0.3.0` vs `0.1.0`, sin ningún tag). El README documenta los tres ejes de versión
  (plugin, `contractVersion` del contrato, servicio `klap-knowledge`) y que no se mueven juntos.
- **Las cinco conexiones del kit llegan con el plugin.** Además de Atlassian, `.mcp.json` declara
  ahora `context7` (`https://mcp.context7.com/mcp`, endpoint público sin credencial) y
  `sonarqube` (`https://api.sonarcloud.io/mcp`, org `multicaja-cloud`, `SONARQUBE_READ_ONLY`).
  `context7` apuntaba a `claude_ai_Context7` —un conector personal de claude.ai, el mismo
  problema que tenía Atlassian— y `sonarqube` **nunca había estado declarado**: su entrada en
  `config/klap.yaml` decía literalmente "nombre esperado … cuando esté disponible".
- **`scripts/verificar-conexiones.mjs` + hook `SessionStart`**: avisa qué variables `KLAP_*`
  faltan, qué se pierde sin cada una y dónde obtener la credencial, con instrucciones para
  dejarla como variable de usuario en Windows y en Linux/Mac. Sólo imprime cuando falta algo. La
  lista sale de `config/klap.yaml` → `mcp.*.requiere_env`, no está hardcodeada: agregar una
  conexión con su `requiere_env` basta para que quede cubierta. `bootstrap/install.ps1` e
  `install.sh` invocan el mismo script.
- Convención: **toda variable de entorno del plugin lleva el prefijo `KLAP_`**, para que se
  distinga de cualquier otra variable del sistema. El schema la impone en `requiere_env`.
- `docs/conexiones.md`: tabla única de las cinco conexiones — qué trae el plugin, qué pone cada
  dev y qué se degrada si falta.

### Fixed

- **El Quality Gate de Sonar aprobaba en silencio.** `scripts/quality-gate.mjs` sólo evaluaba el
  gate `if (s.quality_gate_status)`, así que un reporte sin métricas —el caso de todos, porque el
  MCP de Sonar no estaba declarado— pasaba de largo sin verificarse: `quality_gate_debe_pasar:
  true` era letra muerta. Ahora emite una **advertencia** explícita en ese caso, con las dos
  causas posibles (falta el token, o el proyecto no tiene análisis publicado — lo produce el
  pipeline de Jenkins, no se corre en local). No bloquea: un repo que aún no está en SonarCloud
  sigue certificando. `mutation_score` no cambia, es opcional por diseño.
- `agents/certificador.md`: instrucción explícita de **omitir** el bloque `sonar` cuando no hay
  datos en vez de rellenarlo con ceros (un cero inventado se lee como "verificado y sin
  hallazgos"), y de presentar siempre las `advertencias` junto al veredicto.

### Removed

- **Las evals salen del plugin.** `experimental.evals` y el script `npm run eval` se eliminan:
  `claude plugin eval` está en early access habilitado **por organización** y no hay flag local
  que lo active, así que el plugin dejaba declarada una capacidad que no puede ejercer. Los 6
  casos y sus 17 graders se conservan intactos en `docs/futuro/evals/`, y
  `docs/claude-plugin-eval.md` pasa a ser la ficha de reactivación — con el checklist que faltaba:
  `--no-publish` obligatorio (el default publica el reporte HTML en claude.ai), el modelo-juez
  recibe las transcripciones completas, y los defaults `--runs 3` × `--ablation with-without` son
  36 corridas de agente para 6 casos.
- `PLAN_ATLASSIAN_CLAUDE_CODE.md`: sus 20 criterios de aceptación se cumplen y su contenido vive
  en `docs/atlassian-mcp.md` y este changelog. Las dos validaciones que requerían una segunda
  persona quedaron anotadas en `docs/atlassian-mcp.md`.

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

- **`klap-knowledge` arranca con una sola variable: `KLAP_KNOWLEDGE_HOME`.** La entrada exigía
  además `KLAP_KNOWLEDGE_PYTHON`, que duplicaba información ya contenida en `HOME` y era la causa
  real del `✘ Failed to connect` más común: el default `python` no resuelve `klap_knowledge`
  porque el paquete usa layout `src/`, así que fijar `cwd` en el checkout no alcanza — sin la
  segunda variable el servidor moría al arrancar aunque `HOME` estuviera bien puesta.
  `config/klap.yaml` la documentaba como "opcional", lo que era falso. Ahora `.mcp.json` invoca
  `scripts/klap-knowledge-launch.mjs`, que deriva el intérprete del checkout
  (`<HOME>/.venv/Scripts/python.exe` en Windows, `<HOME>/.venv/bin/python` en POSIX) y cae al
  `python` del `PATH` si no hay venv. Un `.mcp.json` es estático y no puede ramificar por
  plataforma; el launcher es lo que permite derivarlo sin reintroducir una ruta Windows-only ni
  una ruta absoluta. Si falta `HOME`, aborta con un mensaje accionable en **stderr** (nunca en
  stdout, que es el canal JSON-RPC del MCP).

- **`.mcp.json` deja de depender de la máquina de una persona.** La entrada `klap-knowledge`
  apuntaba a `C:\klap-workspace\klap-dev-kit-knowledge\.venv\Scripts\python.exe`: una ruta
  absoluta, además de Windows-only, que hacía fallar ese servidor en el equipo de cualquier otro
  dev. Ahora se resuelve desde `${KLAP_KNOWLEDGE_HOME}` (documentado en `docs/installation.md`,
  paso 4; ver la entrada anterior para cómo se deriva el intérprete). Si falta, falla **sólo** ese
  servidor: el mock y Atlassian siguen conectados. `scripts/validar-plugin.mjs` ahora rechaza cualquier ruta
  absoluta en `.mcp.json`, para que el problema no pueda reaparecer.

- **`config/klap.yaml` → `hosting` describía mal la realidad.** Decía `proveedor_actual: github`
  con `migracion_planificada: bitbucket`, lo que hacía leer Bitbucket como futuro cuando ya es el
  presente de todos los repos de producto (`git@bitbucket.org:multicaja-cloud/…`). Ahora declara
  los dos hostings que **coexisten**: `dev_kit` (GitHub) y `productos` (Bitbucket Cloud,
  workspace `multicaja-cloud`). El bloque sigue siendo informativo — nada del kit lo consume
  programáticamente — pero ya no induce a error sobre dónde vive el código.
- **`marketplace.json` no declaraba `description`**, así que `claude plugin validate --strict`
  fallaba. `scripts/validar-plugin.mjs` ahora exige los campos mínimos de ambos manifests: el
  validador oficial no corre en CI (necesitaría el CLI en el runner), así que sin este chequeo
  un manifest incompleto sólo se descubre al validarlo a mano.

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

## [0.0.1] - 2026-08-26

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
