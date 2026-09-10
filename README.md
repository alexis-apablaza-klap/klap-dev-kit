# Klap Dev-Kit

Plugin corporativo de Claude Code que estandariza y asiste el ciclo completo de desarrollo de
software en Klap: contexto → análisis → diseño → implementación → validación → certificación →
documentación, con validaciones deterministas (tests, coverage, Sonar, dependencias, secretos)
y consumo de la memoria organizacional de Klap Knowledge exclusivamente vía MCP.

Este repo es **sólo el Dev-Kit**. Klap Knowledge es un servicio externo, separado; el kit lo
conoce únicamente a través de un contrato de MCP (`schemas/knowledge-mcp/tools.json`), nunca de
su implementación interna. Ver `docs/architecture-overview.md` para el detalle de esa
separación.

## Instalación

```
/plugin marketplace add https://github.com/alexis-apablaza-klap/klap-dev-kit.git
/plugin install klap@klap-dev-kit
```

Detalle completo, actualización y requisitos: `docs/installation.md`.

## Ejemplo

```
/klap:trabajar-hu KLAP-123
```

```
Fase 1 — Contexto: HU traída de Jira. Producto identificado: abono-ya.
         Klap Knowledge: resumen de producto y de ms-central-sva-anticipo-calculos.
Fase 2 — Análisis: 4 requisitos funcionales, 1 pregunta pendiente sobre el redondeo.
         ⏸ Confirma para continuar a diseño.
Fase 3 — Diseño: ajuste en el cálculo de monto anticipable, sin cambio de contrato REST.
         ⏸ Confirma para continuar a implementación.
Fase 4 — Implementación: 3 archivos modificados, pruebas unitarias agregadas.
Fase 5 — Validación: tests OK, índice de contexto consistente.
Fase 6 — Certificación: coverage 94%, Sonar Quality Gate OK, sin vulnerabilidades HIGH/CRITICAL.
         ✅ aprobado.
Fase 7 — Documentación: docs/decisions/ADR-015.md propuesto.
         ⏸ Confirma antes de publicar en Confluence.
Fase 8 — Finalización: índice de contexto actualizado. Listo para PR.
```

Salida resumida — el detalle real de cada fase queda en `.klap/hu/KLAP-123/`.

## Comandos

8 comandos `/klap:*`: el flujo completo (`trabajar-hu`) y 7 comandos puntuales para ejecutar
una sola fase o capacidad (`analizar`, `disenar`, `desarrollar`, `certificar`, `documentar`,
`actualizar-componente`, `consultar-estandar`). Tabla completa con cuándo usar cada uno:
`docs/commands.md`.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js ≥ 18.
- Git.
- **Una cuenta corporativa Atlassian.** El servidor MCP de Atlassian (Jira, Confluence y
  Bitbucket) lo trae el plugin: no hay que configurarlo ni conseguir un token. Sólo autentícate
  una vez con `/mcp` → `atlassian` → Authenticate. Detalle: `docs/atlassian-mcp.md`.
- MCP SonarQube cuando esté disponible en tu sesión — si no lo está, las fases que lo usan lo
  declaran explícitamente en vez de fallar en silencio o inventar contexto.
- Opcional para certificación completa en el propio repo: Trivy y/o OWASP Dependency-Check
  (`bootstrap/` ayuda a instalarlos).

## Qué hay en este repo

| Carpeta | Qué es |
|---|---|
| `skills/` | Los 8 comandos `/klap:*` |
| `agents/` | 6 sub-agentes especializados (analista, arquitecto, desarrollador, certificador, seguridad, documentador) |
| `standards/` | Estándares Klap versionados, con índice para progressive disclosure |
| `hooks/` + `scripts/` | Validaciones deterministas: secretos, tests, coverage, dependencias, quality gate |
| `schemas/` | Contratos: índice de contexto, y el contrato de Klap Knowledge MCP |
| `mocks/klap-knowledge-mcp/` | Servidor MCP mock para desarrollar/testear el kit sin el servicio real |
| `templates/` | Plantillas para adoptar el kit en un repo de producto (ADR, RDC, `context-index.yaml`, etc.) |
| `config/` | Única fuente de verdad de versiones de stack, nombres de MCP y umbrales de certificación |
| `docs/` | Esta documentación humana |

## Estado del contenido heredado

Parte de `standards/` se migró desde `eco-team-brain` (primera aproximación interna a este
mismo problema); todo ese contenido ya fue revisado y separado en principio generalizable
(promovido a `estado: vigente`) vs. detalle específico de un squad (eliminado). Quedan 2
estándares en `estado: requiere-revision` en `standards/index.yaml`, pero no son migraciones
pendientes de validar — son esqueletos propios de Klap (infraestructura AWS, DDD avanzado) que
esperan insumo del equipo, no contenido heredado. El kit advierte el estado de cada standard
cada vez que lo usa; no lo trates como confirmado mientras diga `requiere-revision`.

## Para contribuir

`npm test` corre las pruebas del propio kit; `npm run validate`
(`scripts/validar-plugin.mjs`) verifica coherencia estructural (manifests, índices, frontmatter
de skills/agents, referencias de hooks) antes de abrir PR.
