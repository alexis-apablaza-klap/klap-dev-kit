# Guía de Usuario — Klap Dev-Kit

> Guía para personas. Si buscas instrucciones para Claude/agentes, ese contenido vive en
> `CLAUDE.md`, `standards/`, `skills/*/SKILL.md` y `agents/*.md`.

Klap Dev-Kit es un **plugin de Claude Code** que estandariza el ciclo de desarrollo en Klap:
contexto → análisis → diseño → implementación → validación → certificación → documentación →
finalización → retroalimentación, con validaciones deterministas (tests, coverage, Sonar,
secretos, dependencias) y acceso a la memoria organizacional de Klap Knowledge.

Esta guía es el mapa. Cada tema tiene **un** documento dueño, y acá sólo va lo que no cabe en
ninguno de ellos.

| Quiero… | Ir a |
|---|---|
| Instalar, actualizar, requisitos, bootstrap | `docs/installation.md` |
| Ver el primer uso fase por fase | `docs/getting-started.md` |
| Saber qué comando usar y cuándo | `docs/commands.md` |
| Entender las pausas, los gates y cómo retomar un flujo | `docs/workflows.md` |
| Resolver un error concreto | `docs/troubleshooting.md` |
| Configurar tokens y servidores MCP | `docs/conexiones.md` |
| Entender la separación kit ↔ Klap Knowledge | `docs/architecture-overview.md` |
| Evaluar el criterio de los agentes | `docs/claude-plugin-eval.md` |

**Arranque mínimo**, dentro de una sesión de Claude Code:

```
/plugin marketplace add https://github.com/alexis-apablaza-klap/klap-dev-kit.git
/plugin install klap@klap-dev-kit
/mcp        → atlassian → Authenticate
```

Lo único manual es autenticar Atlassian: cada persona entra con su cuenta corporativa y queda
con **sus** permisos sobre Jira, Confluence y Bitbucket. No hay tokens que compartir. Si te lo
saltas, las fases que usan esas fuentes lo declaran en vez de inventar contexto.

---

## Qué trae el kit

| Herramienta | Cantidad | Para qué sirve |
|---|---|---|
| Comandos `/klap:*` | 12 | El flujo completo, una fase puntual, o la memoria de producto en Klap Knowledge |
| Agentes especializados | 8 | Cada uno cubre una fase; los invocan los comandos, no se llaman a mano |
| Hooks de validación | 4 | Bloquean commits con secretos y pushes sin certificación; registran la traza del flujo |
| Scripts deterministas | 13 | Tests, coverage, quality gate, escaneo de secretos/dependencias, validación de artefactos, git de la memoria de producto, descubrimiento de componentes |
| Estándares Klap | catálogo en `standards/` | Guías versionadas de arquitectura, seguridad, testing, etc. |
| Plantillas | en `templates/` | ADR, RDC, `context-index.yaml` para adoptar el kit en un repo |

## Los agentes

No se invocan a mano. Sirve saber qué hace cada uno para entender qué esperar en cada pausa:

| Agente | Fase | Rol |
|---|---|---|
| `analista` | Contexto + Análisis | Trae la HU desde Jira, Klap Knowledge y memoria del repo; nunca inventa requisitos ausentes |
| `arquitecto` | Diseño | Propone la solución priorizando consistencia con la arquitectura existente |
| `desarrollador` | Implementación | Escribe código y pruebas siguiendo el diseño aprobado, sin rediseñar |
| `certificador` | Validación/Certificación | Ejecuta e interpreta tests, coverage y Sonar contra los umbrales del kit |
| `seguridad` | Certificación | Revisión OWASP del diff e interpretación de Trivy/Dependency-Check |
| `documentador` | Documentación | Actualiza memoria del repo y, si corresponde, Confluence |
| `documentador-klap` | Finalización (y `/klap:memoria-*`) | Mantiene la memoria global de producto; nunca inventa negocio, componentes ni relaciones |
| `retroalimentador` | Retroalimentación | Propone mejoras al workflow a partir de la traza; propone, nunca aplica |

**Los agentes de sólo lectura lo son técnicamente, no por convención.** `analista` y
`arquitecto` sólo pueden escribir su propio artefacto en `.klap/hu/<ISSUE-KEY>/`: tienen vetados
`Edit` y **ambas** shells. Vetar una sola shell no veta nada — un denylist es tan fuerte como su
entrada más floja — así que `npm run validate` falla si un agente nombra `Bash` sin `PowerShell`
o al revés.

## Los hooks

| Hook | Cuándo actúa | Qué hace |
|---|---|---|
| `pre-commit-secret-scan.mjs` | Antes de `git commit` | Bloquea el commit si detecta un patrón de secreto en el diff |
| `pre-push-quality-gate.mjs` | Antes de `git push` en una rama con el issue en el nombre | Bloquea el push si no hay certificación aprobada para ese issue |
| `post-write-validate-memoria.mjs` | Al escribir archivos de memoria | Valida que el índice de contexto siga siendo consistente |
| `registrar-traza.mjs` | Durante todo el flujo | Escribe `.klap/hu/<KEY>/traza.jsonl`; nunca bloquea ni falla el flujo |

## Memoria de producto: lo que conviene saber antes de cargar un producto

`/klap:memoria-inicializar` y `/klap:memoria-actualizar` escanean los repos del producto con
`scripts/descubrir-componentes.mjs` (determinista, sin LLM) y presentan una **tabla provisional
editable** antes de vincular nada: podés quitar filas, corregir la clasificación o agregar
componentes sin checkout local.

Esa clasificación no es cosmética. Un componente **principal** es propio del producto y se
vincula a él; uno **secundario** es una dependencia transversal compartida (una base de datos,
el repo de properties) y se declara como dependencia de quien lo usa, nunca como componente del
producto — así "los componentes del producto" sigue significando lo propio del producto.

Klap Knowledge es la única fuente de verdad de los componentes: **no existe ni hace falta un
`component.yaml` en el repo**.

Cada patch aplicado lo deja `scripts/memoria-git.mjs` en una rama `producto/<id>` del checkout
de `klap-dev-kit-knowledge` con PR hacia `main`. **El merge siempre es humano.**

## Scripts sueltos desde la terminal

Para depurar o validar sin pasar por un agente:

```bash
npm test                                          # pruebas del propio kit
npm run validate                                  # coherencia estructural del plugin
node scripts/quality-gate.mjs .klap/hu/KLAP-123   # re-evalúa el veredicto de certificación
```
