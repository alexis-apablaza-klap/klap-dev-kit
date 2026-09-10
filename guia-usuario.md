# Guía de Usuario — Klap Dev-Kit

> Guía para personas. Si buscas instrucciones para Claude/agentes, ese contenido vive en
> `CLAUDE.md`, `standards/`, `skills/*/SKILL.md` y `agents/*.md`.

Klap Dev-Kit es un **plugin de Claude Code** que estandariza el ciclo de desarrollo en Klap:
contexto → análisis → diseño → implementación → validación → certificación → documentación,
con validaciones automáticas (tests, coverage, Sonar, secretos, dependencias) y acceso a la
memoria organizacional de Klap Knowledge.

---

## 1. Instalación

Dentro de una sesión de Claude Code:

```
/plugin marketplace add https://github.com/alexis-apablaza-klap/klap-dev-kit.git
/plugin install klap@klap-dev-kit
```

Con eso quedan activos: los 11 comandos `/klap:*`, los 7 agentes especializados, los hooks de
validación, el servidor MCP mock de Klap Knowledge y el servidor MCP de Atlassian (se activan
solos, sin pasos extra).

**Autenticar Atlassian — una vez, y es lo único que tienes que hacer a mano:**

```
/mcp
```

Elige `atlassian` → **Authenticate** → entra con tu cuenta corporativa Klap. Con eso quedan
disponibles Jira, Confluence y Bitbucket, cada uno con **tus** permisos. No hay tokens que pedir
ni compartir. Si te lo saltas, las fases que usan Jira o Confluence te lo dirán en vez de
inventar contexto.

**Actualizar:**

```
/plugin update klap@klap-dev-kit
```

**Verificar que quedó instalado:** escribe `/klap:` en el prompt — deberían listarse los 11
comandos.

### Requisitos

- Claude Code con soporte de plugins.
- Node.js ≥ 18 y Git.
- Cuenta corporativa Atlassian (el MCP viene con el plugin; sólo hay que autenticarse) y MCP
  SonarQube para certificación — si no están conectados, el kit lo declara en vez de fallar en
  silencio.
- Opcional, para certificación completa: Trivy y/o OWASP Dependency-Check. El script
  `bootstrap/install.ps1` (Windows) / `install.sh` (Linux/Mac) revisa qué falta e indica dónde
  instalarlo — no instala nada por sí solo.

Detalle completo: `docs/installation.md`. Problemas comunes: `docs/troubleshooting.md`.

---

## 2. Qué trae el kit

| Herramienta | Cantidad | Para qué sirve |
|---|---|---|
| Comandos `/klap:*` | 11 | Ejecutar el flujo completo, una fase puntual, o gestionar la memoria de producto en Klap Knowledge |
| Agentes especializados | 7 | Cada uno cubre una fase del flujo o la memoria global de producto (los invocan los comandos, no se llaman a mano) |
| Hooks de validación | 3 | Bloquean automáticamente commits con secretos y pushes sin certificación |
| Scripts deterministas | 10 | Tests, coverage, quality gate, escaneo de secretos/dependencias, validación de artefactos, git de la memoria de producto |
| MCP mock de Klap Knowledge | 1 | Simula la memoria organizacional para probar el flujo sin el servicio real |
| Estándares Klap | catálogo en `standards/` | Guías versionadas de arquitectura, seguridad, testing, etc. |
| Plantillas | en `templates/` | ADR, RDC, `context-index.yaml` para adoptar el kit en un repo |

### 2.1 Comandos `/klap:*`

| Comando | Qué hace |
|---|---|
| `/klap:trabajar-hu <ISSUE-KEY>` | Flujo completo de 8 fases para una HU real (el que usarás casi siempre) |
| `/klap:analizar <ISSUE-KEY o descripción>` | Solo contexto + análisis — para estimar o decidir alcance sin comprometerte |
| `/klap:disenar [analisis.md]` | Solo diseño, a partir de un análisis ya hecho |
| `/klap:desarrollar [diseno.md]` | Solo implementación, a partir de un diseño ya aprobado |
| `/klap:certificar [repo] [ISSUE-KEY]` | Tests + coverage + Sonar + dependencias, con veredicto — para re-certificar sin repetir todo |
| `/klap:documentar [ISSUE-KEY]` | Actualiza memoria del repo y, si corresponde, Confluence |
| `/klap:actualizar-componente [repo]` | Da de alta o pone al día `docs/context/index.yaml` de un repo. La representación del componente vive en Klap Knowledge |
| `/klap:consultar-estandar <tema>` | Muestra el estándar Klap relevante a un tema, sin arrancar ningún flujo |
| `/klap:memoria-inicializar <producto>` | Construye la memoria inicial de un producto en Klap Knowledge (pausa humana antes de aplicar) |
| `/klap:memoria-actualizar <producto\|ISSUE-KEY>` | Actualiza incrementalmente la memoria de un producto, sin releer todo |
| `/klap:memoria-consultar <producto o pregunta>` | Responde usando la memoria consolidada de Klap Knowledge |

Tabla ampliada con criterios de cuándo usar cada uno: `docs/commands.md`.

### 2.2 Agentes

No se invocan a mano — cada comando delega automáticamente en el agente que corresponde a esa
fase. Sirve saber qué hace cada uno para entender qué esperar en cada pausa del flujo:

| Agente | Fase | Rol |
|---|---|---|
| `analista` | Contexto + Análisis | Trae la HU desde Jira, Klap Knowledge y memoria del repo; nunca inventa requisitos ausentes |
| `arquitecto` | Diseño | Propone la solución priorizando consistencia con la arquitectura existente |
| `desarrollador` | Implementación | Escribe código y pruebas siguiendo el diseño aprobado, sin rediseñar |
| `certificador` | Validación/Certificación | Ejecuta e interpreta tests, coverage y Sonar contra los umbrales del kit |
| `seguridad` | Certificación | Revisión OWASP del diff e interpretación de Trivy/Dependency-Check |
| `documentador` | Documentación | Actualiza memoria del repo y, si corresponde, Confluence |
| `documentador-klap` | Finalización (y `/klap:memoria-*`) | Mantiene la memoria global de producto en Klap Knowledge; nunca inventa negocio, componentes ni relaciones |

### 2.3 Hooks (automáticos, no requieren acción)

| Hook | Cuándo actúa | Qué hace |
|---|---|---|
| `pre-commit-secret-scan.mjs` | Antes de `git commit` | Bloquea el commit si detecta un patrón de secreto en el diff |
| `pre-push-quality-gate.mjs` | Antes de `git push` en una rama con el issue en el nombre (`feature/KLAP-123-...`) | Bloquea el push si no hay certificación aprobada para ese issue |
| `post-write-validate-memoria.mjs` | Después de escribir/editar archivos de memoria | Valida que el índice de contexto siga siendo consistente |

### 2.4 MCP: Klap Knowledge

`klap-knowledge-local-mock` se registra solo al instalar el plugin y sirve datos de ejemplo
(`mocks/klap-knowledge-mcp/fixtures/`) para probar el flujo sin depender del servicio real. El
día que exista el servicio real, sólo cambia `config/klap.yaml` — ningún comando ni agente
necesita tocarse.

El contrato tiene 11 tools: las de consulta de siempre (`buscar_producto`, `resumen_producto`,
`resumen_componente`, `buscar`, `documentos_relevantes`), `producto_por_epica` (resuelve
determinísticamente el producto de una HU a partir de su épica Jira — es el gate de producto de
fase 1 de `/klap:trabajar-hu`), la memoria estructurada completa de un producto
(`obtener_producto`, `historial_producto`, `estado_fuentes`), y una única vía de escritura real
— `aplicar_patch_memoria` — que sólo usa el agente `documentador-klap` (nunca a mano).
`targeted_sync` sigue existiendo pero está deprecada.

Cada vez que `aplicar_patch_memoria` se aplica, `scripts/memoria-git.mjs` deja el cambio en una
rama `producto/<id>` del checkout de `klap-dev-kit-knowledge` (`config/klap.yaml` →
`memoria.repo_path`) con PR hacia `main` — el merge siempre es humano.

Para levantarlo manualmente fuera de Claude Code (debug):

```bash
node mocks/klap-knowledge-mcp/server.mjs
```

---

## 3. Ejemplos de uso

### Flujo completo sobre una HU real

```
/klap:trabajar-hu KLAP-123
```

Avanza fase por fase, deteniéndose a pedir tu confirmación después de **Análisis** y de
**Diseño** (los puntos más baratos para corregir el rumbo), y se detiene solo si la
certificación no aprueba. Si la HU pertenece a un producto que todavía no existe en Klap
Knowledge, **Contexto** se detiene primero: dispara `/klap:memoria-inicializar` y pide tu
aprobación antes de seguir — la HU no se analiza sin memoria de producto resuelta. Al final
entrega un resumen corto; el detalle de cada fase queda en `.klap/hu/KLAP-123/`.

### Solo una fase puntual

Ya tienes el diseño resuelto y sólo falta implementar:

```
/klap:desarrollar diseno.md
```

Quieres re-certificar después de un fix, sin repetir análisis/diseño:

```
/klap:certificar . KLAP-123
```

### Consulta rápida a un estándar (sin flujo)

```
/klap:consultar-estandar logging
```

Devuelve sólo el estándar relevante — no arranca ninguna fase.

### Consulta rápida a la memoria de un producto (sin flujo)

```
/klap:memoria-consultar "qué productos dependen de Liquidaciones"
```

Responde con la memoria consolidada de Klap Knowledge, expandiendo a Jira/Confluence sólo si
hace falta — nunca escribe memoria, aunque detecte algo desactualizado.

### Onboarding de un repo nuevo al kit

```
/klap:actualizar-componente ms-central-sva-anticipo-calculos
```

Revisa el repo y propone/actualiza `docs/context/index.yaml` para que el
resto de los comandos tengan memoria de ese componente. La representación del componente en sí
(qué productos lo usan, sus capabilities) vive en Klap Knowledge, no en un archivo del repo.

### Scripts deterministas (fuera del flujo de un comando)

Útiles para depurar o correr validaciones sueltas desde la terminal, sin pasar por un agente:

```bash
npm test              # pruebas del propio kit
npm run validate       # coherencia estructural del plugin (manifests, índices, frontmatter)
node scripts/quality-gate.mjs .klap/hu/KLAP-123   # re-evalúa el veredicto de certificación
```

---

## 4. Más documentación

| Documento | Contenido |
|---|---|
| `docs/getting-started.md` | Recorrido guiado del primer uso, fase por fase |
| `docs/commands.md` | Tabla completa de comandos y cuándo usar cada uno |
| `docs/installation.md` | Instalación, actualización, requisitos y bootstrap |
| `docs/workflows.md` | Flujos de trabajo típicos combinando comandos |
| `docs/troubleshooting.md` | Soluciones a problemas frecuentes (push bloqueado, falsos positivos de secretos, etc.) |
| `docs/architecture-overview.md` | Cómo se relaciona el kit con Klap Knowledge y el resto del ecosistema |
| `docs/claude-plugin-eval.md` | Qué hace `claude plugin eval`, los 3 casos del kit, y estado del early access |
