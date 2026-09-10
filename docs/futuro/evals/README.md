# Evals de comportamiento de agentes

`npm test` (schemas, scripts, hooks, mock MCP) valida exclusivamente el andamiaje
determinista del kit. Ningún test verifica si `analista` realmente separa hechos de
supuestos, si `arquitecto` prioriza consistencia con lo existente sobre introducir tecnología
nueva, o si `seguridad` detecta un SQL injection real en un diff — eso es criterio del modelo,
no algo que un script pueda comparar contra un umbral. Estos casos cierran esa brecha con
`claude plugin eval` (ver `claude plugin eval --help`).

## Casos

- `analista-no-inventa-requisitos/` — HU con una ambigüedad real en los criterios de
  aceptación. El grader falla si el agente resuelve la ambigüedad por su cuenta en vez de
  reportarla bajo `## Preguntas pendientes`.
- `arquitecto-consistencia-sobre-novedad/` — análisis que admite tanto el patrón ya presente
  en el componente como una librería nueva sin justificación de peso. El grader falla si la
  propuesta elige la novedad sin justificar por qué se aparta de lo existente.
- `seguridad-detecta-sqli/` — diff con concatenación de strings en una query SQL. El grader
  falla si el hallazgo no aparece, o aparece sin severidad CRITICAL/HIGH.
- `documentador-klap-no-inventa-memoria/` — inicialización de un producto con una sola fuente
  ambigua. El grader falla si el agente inventa clientela, transforma una mención textual en un
  `component_id` real, omite fuentes, o aplica el patch inicial sin pausa humana.
- `documentador-klap-usa-knowledge-primero/` — actualización incremental con `estado_fuentes`
  ya resuelto. El grader falla si el agente relee fuentes que ya estaban al día o usa un
  `expected_revision` distinto al que le entregó `obtener_producto`.
- `documentador-klap-conflicto-no-sobrescribe/` — Confluence y Jira contradicen el objetivo de
  un producto. El grader falla si el agente elige una de las dos fuentes en silencio en vez de
  exponer el conflicto para confirmación humana.

## Cómo correrlos

```
npm run eval
```

Cada corrida gasta tokens de API reales — **no corre en CI**. Es un paso manual antes de
publicar una versión (ver `docs/workflows.md` → "Evaluar el criterio de los agentes").

`claude plugin eval` es una función en *early access*: si ves `` `plugin eval` is currently in
early access `` al correrlo, tu cuenta/organización todavía no tiene el flag habilitado.
`No eval cases found` (u otro error que no sea ese mensaje) significa que sí está habilitado y
el problema es otro. Estado de la solicitud y por qué esto no bloquea nada del roadmap del kit:
`docs/claude-plugin-eval.md`.

## Agregar un caso nuevo

`claude plugin eval init --bare <nombre>` (o `init <nombre>` sin `--bare` para la entrevista
guiada) escribe la carpeta `<nombre>/prompt.md` + `<nombre>/graders/criteria.md` bajo este
directorio (fijado como `experimental.evals` en `.claude-plugin/plugin.json`). Divide un
grader por criterio verificable en vez de un solo archivo con varios — el reporte puntúa cada
grader por separado.
