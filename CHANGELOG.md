# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

Una o dos líneas por cambio. El razonamiento de fondo vive donde se puede actuar sobre él: los
comentarios del script o del agente que lo implementa, `docs/`, y — para el contrato de Knowledge
— `docs/contrato-historial.md` en `klap-dev-kit-knowledge`.

## [Unreleased]

## [0.1.9-alpha] - 2026-09-12

### Fixed

- `memoria-git.mjs` aborta si `--changed-files` está incompleto y deja fuera un archivo del
  propio producto. El guard de `0.1.6-alpha` cubría el error de más (arrastrar otro producto);
  éste cubre el de menos, que falla peor: el PR sale bien formado y le falta una pieza. Un
  componente sin stagear se reporta pero **no** bloquea — no se puede atribuir a un producto por
  su nombre, y abortar rompería el flujo de un script por producto.

## [0.1.8-alpha] - 2026-09-12

### Fixed

- `seguridad` se declaraba de sólo lectura vetando `Write` y `Edit`, pero conservaba ambas
  shells: la garantía era decorativa. Ahora veta las dos, y los escaneos deterministas
  (`deps-scan.mjs`, `auditar-kafka.mjs`) más el `git diff` los prepara el orquestador y se los
  pasa como insumo — misma división que ya rige en la fase 5.
- `validar-plugin.mjs` rechaza vetar `Write` sin vetar ambas shells. La asimetría es
  deliberada: vetar sólo `Edit` no promete sólo-lectura y no arrastra la exigencia, porque
  `certificador` necesita la shell para correr los gates.

## [0.1.7-alpha] - 2026-09-12

### Changed

- Barrido de documentación: `guia-usuario.md` deja de duplicar `docs/` y pasa a ser el mapa de
  entrada; este CHANGELOG pasa de narrativo a entradas de una o dos líneas.
- Corregida la deriva de conteos en README, `guia-usuario.md`, `installation.md` y
  `troubleshooting.md`: son 12 comandos, 8 agentes, 4 hooks y 13 scripts, no los números de la
  versión inicial. `getting-started.md` y el ejemplo del README incluyen la fase 9.

## [0.1.6-alpha] - 2026-09-12

### Fixed

- Un veto de shell parcial no vetaba nada: `analista`, `arquitecto`, `documentador` y
  `documentador-klap` vetaban `Bash` sin `PowerShell` y conservaban escritura al disco pese a
  declararse de sólo lectura. Los cuatro vetan ambas, y `validar-plugin.mjs` rechaza un veto
  parcial en cualquier dirección.
- `analista` y `arquitecto` recuperan `Write` — el skill se los exige para producir sus
  artefactos. Siguen sin `Edit` ni shell: crean artefactos, no tocan código.
- `memoria-git.mjs` ya no mezcla productos: sin `--changed-files` stageaba todo `memory/`, así que
  dos patches terminaban en el PR del primero. Ahora detecta la mezcla, limpia el índice y falla.

### Notes

Los tres salieron de ejecutar la fase 7 del plan sobre una HU real (SVA-2737), no de una revisión
de código: ninguno rompía nada visible.

## [0.1.5-alpha] - 2026-09-10

### Changed

- `created_by` de un `append_event` queda anclado a `generated_by.agent` del patch: el timeline es
  append-only, así que un valor mal puesto no se corrige nunca.
- Una fuente releída se re-emite con su `version`/`updated_at` — el cursor de frescura de la
  memoria. Requiere servicio de Knowledge ≥ `0.3.2`. Una fuente que no se puede fechar va sin
  ellos: campo ausente antes que fecha inventada.

### Known limitations

- El anclaje de `created_by` es regla del agente, no validación del store: exigirlo sería contrato
  `2.5.0` y rompería a cualquier productor existente. Propuesto, no aplicado.

## [0.1.4-alpha] - 2026-09-10

### Changed

- Sonar y cobertura se leen **sólo** del ambiente `desa` (decisión del Tech Lead):
  `ambiente_unico` reemplaza a `ambiente_por_defecto` + `ambientes`. Un repo sin proyecto en
  `desa` no tiene gate de Sonar — no se cae a `qa`, porque certificar contra otro ambiente
  responde una pregunta distinta de la que hace la HU.
- `certificador` paso 4b: todas las medidas salen del proyecto de `desa`. Mezclar un número de
  `desa` con otro de `qa` no es un veredicto.

### Removed

- REQUIERE-USUARIO sobre `prefijos_tipo`, retirado sin responderse: la key se resuelve vía MCP y
  nunca se construye, así que la respuesta no cambiaba ninguna decisión.

## [0.1.3-alpha] - 2026-09-10

### Added

- **Fase 9 — Retroalimentación** en `/klap:trabajar-hu`, no bloqueante y sin pausa: observa el
  *workflow*, no la HU. Agente `retroalimentador` (allowlist `Read, Glob, Grep, Write`: propone,
  no ejecuta) y skill `/klap:retroalimentar`.
- `hooks/registrar-traza.mjs`: traza determinista en `.klap/hu/<KEY>/traza.jsonl`. Existe porque un
  agente no puede leer retroactivamente la ejecución de otro — sin ella el retroalimentador sería
  ciego a reintentos y a gates que reprobaron y se corrigieron. Nunca bloquea el flujo que observa.
- `docs/mejoras-sugeridas.md` rastreado en git, con techo de 12 entradas activas y regla
  anti-bloat en el propio archivo. Nace vacío a propósito.

### Changed

- Contrato de eventos de hook verificado contra el runtime instalado (Claude Code 2.1.267), no
  contra el doc: `PostToolUse` ya trae `duration_ms`, y `agent_type` permite atribuir una llamada
  a su fase.
- Se registra `PostToolUseFailure`, que no estaba en el plan: un gate que reprobó y se corrigió
  termina en un `PostToolUse` exitoso, así que sin ese evento la fricción a observar no deja
  rastro.
- `fase` se emite sólo cuando es derivable sin ambigüedad — `analista` cubre las fases 1 y 2, así
  que sus eventos van sin `fase`. Ausente no es cero.

### Known limitations

- `SubagentStop` no trae `tool_input`: la atribución a una HU depende del nombre de la rama. En una
  rama sin ISSUE-KEY la traza pierde los cierres de fase — degradación parcial, no corrupción.
- Acotar la escritura del `retroalimentador` a un solo archivo es regla del agente, no del runtime.

## [0.1.2-alpha] - 2026-09-10

### Added

- Resolución de la project key de SonarQube, verificada contra la organización real: **no es
  descubrible desde el repo** (vive en la config de Jenkins). Se resuelve vía
  `search_my_sonarqube_projects` y se **omite el bloque `sonar` con advertencia** si hay 0 o >1
  candidatos; nunca se construye por concatenación.
- Registrado que `abono-ya` no tiene proyecto en SonarCloud: una HU de ese producto no puede
  ejercer el gate, y eso es advertencia, no reprobación.
- Mapeo campo del gate → tool del MCP en `agents/certificador.md`.

### Fixed

- `rating_mantenibilidad` habría dejado la HU sin veredicto: el MCP devuelve `sqale_rating` como
  `"1.0"`, no `"A"`, y `quality-gate.mjs` **lanza** con ese valor. El agente convierte `1→A … 5→E`.
- `bugs_nuevos`/`vulnerabilities_nuevas` salen de las métricas `new_bugs`/`new_vulnerabilities`:
  `search_sonar_issues_in_projects` no tiene filtro de nuevo código y contaría el histórico.
- `security_hotspots_sin_revisar` no tiene métrica propia: se cuenta con `search_security_hotspots`
  (`status: TO_REVIEW`, `sinceLeakPeriod`) → `paging.total`.
- Una medida `new_*` puede volver sin `value` si no hay período de nuevo código con cambios. El
  campo se **omite**, nunca se rellena con 0 — el 0 inventado aprueba de verdad.

### Changed

- Precedencia de cobertura explícita: el 92% del kit manda sobre el 80% del QG de SonarCloud
  porque miden cosas distintas (unit del cambio vs. global del proyecto), no son un indicador con
  dos valores.

## [0.1.1-alpha] - 2026-09-10

### Added

- El productor de documentos existe: `documentador-klap` emite un `upsert_document` por página de
  Confluence leída, más el cursor en `upsert_source_state → confluence.pages`. Antes lo leído
  quedaba en un artefacto gitignoreado y la pasada siguiente releía el espacio completo.
- Las dos asimetrías quedan documentadas: `upsert_document` **reemplaza** la fila (al revés que
  `upsert_component`), y documento y cursor van juntos o el delta-sync no converge.

### Changed

- Contrato Klap Knowledge MCP `2.3.0` → `2.4.0` (aditivo): las tres operaciones de baja,
  `incluir_deprecados`, `status` en `resumen_componente` y en cada resultado de `buscar`, tipo
  `evento` en `buscar.tipos`, y `operaciones_sin_efecto`.
- El mock local alcanza al contrato 2.4.0. No emite `operaciones_sin_efecto`: no tiene el contenido
  de la memoria, así que no puede saber si había algo que borrar.

### Fixed

- El mock reportaba `documents.yaml` en `changed_files`: esa ruta nunca existió, es
  `documents.ndjson`.
- El fixture declaraba `mc_tlog` como id de dependencia, imposible bajo `^[a-z0-9][a-z0-9-]*$`.

## [0.1.0-alpha] - 2026-09-10

Primera versión con tag. La entrada del 2026-08-26 quedó renumerada como `0.0.1`.

### Added

- Versionado formal: `plugin.json` y `package.json` declaran la misma cadena y `validar-plugin.mjs`
  las cruza contra una entrada del CHANGELOG — antes derivaban en silencio (`0.3.0` vs `0.1.0`).
  El README documenta los tres ejes de versión y que no se mueven juntos.
- Las cinco conexiones llegan con el plugin: `.mcp.json` declara `context7` y `sonarqube`, que
  nunca había estado declarado pese a tener entrada en `config/klap.yaml`.
- Conexión Atlassian por el plugin (Rovo MCP oficial, endpoint v2, OAuth por persona, sin
  credenciales en el repo). El endpoint v2 **sí** cubre Bitbucket — corrige la conclusión previa,
  que se había sacado contra el endpoint v1 del conector personal.
- `scripts/verificar-conexiones.mjs` + hook `SessionStart`: avisa qué variables `KLAP_*` faltan y
  dónde obtenerlas. La lista sale de `config/klap.yaml`, no está hardcodeada.
- Convención: toda variable de entorno del plugin lleva prefijo `KLAP_`, impuesto por el schema.
- Gate de producto por épica Jira en fase 1 (`producto_por_epica`, contrato `2.1.0`), con
  `buscar_producto` como respaldo. Si ningún producto existe, la fase se detiene y dispara
  `/klap:memoria-inicializar`: el análisis nunca avanza sin memoria de producto resuelta.
- Contrato `2.3.0`: `upsert_component` crea `memory/components/<id>.yaml` — hasta entonces
  `upsert_component_link` no tenía forma de que ese archivo llegara a existir. Ver
  `docs/contrato-historial.md` en `klap-dev-kit-knowledge`.
- `scripts/memoria-git.mjs`: deja cada patch aplicado en una rama `producto/<id>` con PR hacia
  `main`. El merge sigue siendo siempre humano.

### Fixed

- El Quality Gate de Sonar aprobaba en silencio: `quality-gate.mjs` sólo evaluaba el gate
  `if (s.quality_gate_status)`, así que un reporte sin métricas pasaba de largo y
  `quality_gate_debe_pasar: true` era letra muerta. Ahora emite advertencia explícita sin
  bloquear.
- `klap-knowledge` arranca con una sola variable, `KLAP_KNOWLEDGE_HOME`:
  `scripts/klap-knowledge-launch.mjs` deriva el intérprete del checkout. Un `.mcp.json` es
  estático y no puede ramificar por plataforma; el launcher es lo que evita una ruta Windows-only.
- `.mcp.json` deja de depender de la máquina de una persona (tenía una ruta absoluta).
  `validar-plugin.mjs` rechaza ahora cualquier ruta absoluta ahí.
- `config/klap.yaml → hosting` hacía leer Bitbucket como futuro cuando ya es el presente de todos
  los repos de producto. Declara los dos hostings que coexisten.
- `marketplace.json` no declaraba `description` y `claude plugin validate --strict` fallaba.

### Changed

- Mínimo privilegio: `analista`, `arquitecto`, `seguridad` y `certificador` niegan las tools de
  escritura de Atlassian. `documentador` y `documentador-klap` las conservan porque las necesitan.
- `validar-plugin.mjs` cruza los nombres de tools MCP del frontmatter contra `config/klap.yaml`: el
  frontmatter es la única excepción a "nunca hardcodees un nombre de servidor MCP", porque se
  evalúa antes de que el agente pueda leer la config.
- Los agentes distinguen **MCP no autenticado** de **MCP conectado sin permisos**: un JQL vacío
  puede ser falta de acceso, no ausencia de datos.

### Removed

- Las evals salen del plugin: `claude plugin eval` está en early access **por organización** y no
  hay flag local, así que el plugin declaraba una capacidad que no puede ejercer. Los 6 casos y sus
  17 graders se conservan en `docs/futuro/evals/`; `docs/claude-plugin-eval.md` es la ficha de
  reactivación.
- `component.yaml` por repo, eliminado por completo: no se mantenía actualizado y su exigencia
  bloqueaba todo enlace producto-componente. `docs/context/index.yaml` es otro concepto y no se ve
  afectado.
- `PLAN_ATLASSIAN_CLAUDE_CODE.md`: sus 20 criterios se cumplen y su contenido vive en
  `docs/atlassian-mcp.md`.

## [0.0.1] - 2026-08-26

### Added

- Estructura inicial del plugin, workflow `/klap:trabajar-hu` (8 fases) y los skills
  complementarios.
- Siete agentes especializados, separando la memoria organizacional de producto
  (`documentador-klap`) de la memoria técnica del repo (`documentador`).
- Contrato Klap Knowledge MCP v2.0.0 (10 tools) y servidor mock local para desarrollar el kit
  desacoplado del servicio real.
- Skills `memoria-inicializar`, `memoria-actualizar` y `memoria-consultar`.
- Validaciones deterministas (`scripts/*.mjs`) y hooks bloqueantes: secretos en commit,
  certificación en verde antes de push.
- `standards/` inicial, plantillas, documentación humana y suite de tests del propio kit.

---

## Pendiente para 1.0.0

- Completar los 2 estándares en `estado: requiere-revision`:
  `standards/infraestructura/aws-serverless.md` y `standards/arquitectura/ddd-avanzado.md`. Son
  esqueletos que esperan insumo del equipo, no contenido migrado pendiente de revisar.
- Recalibrar `mutacion.minimo_score` (60%) contra un repo real. Umbral interino aceptado
  (2026-08-28); no bloquea nada mientras tanto.
- `claude plugin eval`: bloqueado por early access a nivel de organización, no por código del kit.
  Pendiente indefinido y no bloqueante por decisión explícita del usuario.
