# Evaluación del criterio de los agentes — fase futura

> **Estado: fuera del plugin.** `claude plugin eval` está en *early access* habilitado por
> organización, así que el kit **no declara** `experimental.evals` ni expone un script `eval`.
> Los 6 casos y sus 17 graders se conservan intactos en `docs/futuro/evals/` para el día que el
> acceso quede habilitado. Este archivo es la ficha de reactivación.

## El problema que resuelve

`npm test` valida sólo el andamiaje determinista del kit (schemas, scripts, hooks, mock MCP) —
nada verifica si un agente **razona bien**. `claude plugin eval` corre un caso
(`<caso>/prompt.md`) como una sesión real de Claude Code contra el plugin, y un **modelo-juez**
evalúa la transcripción contra cada criterio declarado en `<caso>/graders/*.md` (un grader por
criterio verificable, puntuado por separado).

## Los 6 casos conservados (`docs/futuro/evals/`)

| Caso | Falla si... |
|---|---|
| `analista-no-inventa-requisitos` | el agente resuelve una ambigüedad real de la HU por su cuenta en vez de reportarla en `## Preguntas pendientes` |
| `arquitecto-consistencia-sobre-novedad` | el diseño elige una librería nueva sin justificar por qué se aparta del patrón ya presente en el componente |
| `seguridad-detecta-sqli` | el review no identifica explícitamente la inyección SQL del diff, o la nombra sin severidad CRITICAL/HIGH |
| `documentador-klap-no-inventa-memoria` | el agente inventa clientela, transforma una mención textual en un `component_id` real, omite fuentes, o aplica el patch inicial sin pausa humana |
| `documentador-klap-usa-knowledge-primero` | el agente relee fuentes ya al día o usa un `expected_revision` distinto al que entregó `obtener_producto` |
| `documentador-klap-conflicto-no-sobrescribe` | el agente elige una fuente en silencio ante una contradicción entre Confluence y Jira, en vez de exponer el conflicto |

## Por qué no se puede correr hoy

El gate es **por organización**: no hay flag local, canal beta del CLI, variable de entorno del
proyecto ni comando alternativo que lo sortee.

- **Clientes first-party** (API directa de Anthropic): se habilita **automáticamente** tras
  `claude update` + sesión nueva. No hay nada que pedir.
- **Clientes no first-party** (Bedrock, Vertex, `ANTHROPIC_BASE_URL` propio, o con
  `DISABLE_TELEMETRY` / `DO_NOT_TRACK` activo): requieren una variable de entorno que Anthropic
  entrega en el onboarding. Su nombre **no está documentado**.

**Primera acción al reactivar, antes de cualquier trámite:** verificar que `DISABLE_TELEMETRY` y
`DO_NOT_TRACK` **no** estén seteados en el entorno. Estarlo mueve la cuenta a la rama que sí exige
habilitación explícita, y es la causa más barata de descartar.

Solicitud enviada al representante de cuenta Anthropic el 2026-08-28, sin ETA. Lo institucional
(quién lo activa, costo, retención de las transcripciones que ve el juez, si se puede limitar por
usuario) **no está documentado públicamente** — hay que preguntarlo.

### Cómo detectar que ya está habilitado

No hay comando de status: el mensaje `` `plugin eval` is currently in early access `` simplemente
deja de aparecer. Probe **sin costo de tokens**, porque no matchea ningún caso:

```bash
claude plugin eval . --case __nada__
```

Cualquier respuesta distinta del mensaje de early access significa que ya está activo.

## Checklist de reactivación

Cuando el acceso esté habilitado, en este orden:

1. **`--no-publish` obligatorio.** El default **publica el reporte HTML en claude.ai**
   (`--publish-report` es el default cuando la cuenta lo soporta). Los casos llevan contexto real
   —nombres de repos Klap, `component_id`, épicas, un diff con SQLi—, así que la primera corrida
   sin ese flag lo publicaría.
2. **Revisar el contenido de los `prompt.md`.** El modelo-juez (`--judge-model`, default `haiku`)
   recibe la transcripción completa de cada corrida. Decidir si el contexto de cada caso debe ser
   sintético antes de mandarlo.
3. **Acotar el costo de la primera pasada.** Los defaults son `--runs 3` por caso y
   `--ablation with-without` (agrega un brazo baseline sin plugin) — con 6 casos son **36 corridas
   de agente** más los graders. Arrancar con:
   ```bash
   claude plugin eval . --eval-dir docs/futuro/evals --no-publish \
     --runs 1 --ablation none --max-cost-usd <techo>
   ```
4. **Decidir los mocks.** No existe `docs/futuro/evals/mocks/`, y los 3 casos de
   `documentador-klap` dependen de las tools de Klap Knowledge. `--mocks record` (default) graba
   stand-ins en la primera corrida; `--mocks off --allow-tools 'mcp__*'` levanta los servidores
   **reales** contra memoria real — elegir con intención, no por omisión.
5. **Reponer la declaración en el plugin** (`experimental.evals`) y el script `eval` en
   `package.json`, sólo si se decide devolver los casos a la raíz del repo.

## Ver también

- `docs/futuro/evals/README.md` — estructura de carpetas y cómo escribir un grader nuevo.
- `docs/workflows.md` → "Evaluar el criterio de los agentes".
