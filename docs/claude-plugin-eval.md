# `claude plugin eval`

## Qué es

`npm test` valida sólo el andamiaje determinista del kit (schemas, scripts, hooks, mock MCP) —
nada verifica si un agente **razona bien**. `claude plugin eval` cierra esa brecha: corre un
caso (`evals/<caso>/prompt.md`) como una sesión real de Claude Code contra el plugin, y un
**modelo-juez** evalúa la transcripción resultante contra cada criterio declarado en
`evals/<caso>/graders/*.md` (un grader por criterio verificable, puntuado por separado — no un
solo archivo con varios). Por eso gasta tokens de API reales dos veces (correr el caso + el
juez) y por eso **no corre en CI**: es un paso manual antes de publicar una versión.

## Los 6 casos de este kit (`evals/`)

| Caso | Falla si... |
|---|---|
| `analista-no-inventa-requisitos` | el agente resuelve una ambigüedad real de la HU por su cuenta en vez de reportarla en `## Preguntas pendientes` |
| `arquitecto-consistencia-sobre-novedad` | el diseño elige una librería nueva sin justificar por qué se aparta del patrón ya presente en el componente |
| `seguridad-detecta-sqli` | el review no identifica explícitamente la inyección SQL del diff, o la nombra sin severidad CRITICAL/HIGH |
| `documentador-klap-no-inventa-memoria` | el agente inventa clientela, transforma una mención textual en un `component_id` real, omite fuentes, o aplica el patch inicial sin pausa humana |
| `documentador-klap-usa-knowledge-primero` | el agente relee fuentes ya al día o usa un `expected_revision` distinto al que entregó `obtener_producto` |
| `documentador-klap-conflicto-no-sobrescribe` | el agente elige una fuente en silencio ante una contradicción entre Confluence y Jira, en vez de exponer el conflicto |

Correrlos: `npm run eval`. Agregar uno nuevo: `claude plugin eval init --bare <nombre>` (detalle
completo, incluida la estructura de carpetas, en `evals/README.md`).

## Estado actual: pendiente indefinido, no bloqueante

`claude plugin eval` es una función en *early access* de Claude Code — el flag lo habilita
Anthropic a nivel de **organización**, no hay setting local que lo active. Hoy responde
`` `plugin eval` is currently in early access `` al correrlo.

- La solicitud de habilitación **ya fue enviada** al representante de cuenta Anthropic
  (2026-08-28).
- No hay ETA — la autorización puede demorar de forma impredecible.
- Decisión explícita del usuario: este ítem **no bloquea** ningún cierre de etapa/ronda del
  kit ni el inicio de Etapa 3. Se retoma sin fecha fija, corriendo `npm run eval` tal como está
  hoy en cuanto el acceso quede habilitado (auto-test: si el mensaje cambia a algo distinto de
  "currently in early access" — p.ej. `No eval cases found` en un directorio vacío — ya está
  habilitado).

## Ver también

- `evals/README.md` — estructura de carpetas, cómo escribir un grader nuevo.
- `docs/workflows.md` → "Evaluar el criterio de los agentes" — cuándo correrlo en el flujo de
  publicación.
