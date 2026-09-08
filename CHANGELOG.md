# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

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
- `claude plugin eval`: 3 casos semilla escritos (`analista`, `arquitecto`, `seguridad`) pero
  nunca ejecutados — bloqueado por early access de Anthropic a nivel de organización, no por
  código del kit. Solicitud ya enviada a la cuenta rep (2026-08-28), sin ETA. **Pendiente
  indefinido, no bloqueante** por decisión explícita del usuario — ver
  `docs/claude-plugin-eval.md`.
