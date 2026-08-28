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
- Seis agentes especializados: `analista`, `arquitecto`, `desarrollador`, `certificador`,
  `seguridad`, `documentador`.
- Contrato de Klap Knowledge MCP (`schemas/knowledge-mcp/`) y servidor mock local
  (`mocks/klap-knowledge-mcp/`) para desarrollar y testear el kit desacoplado del servicio
  real.
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
  `scripts/quality-gate.mjs`) — REQUIERE-USUARIO: falta calibrar `minimo_score` (hoy 60%,
  placeholder) contra un repo real corriendo PITest/Stryker.
- `scripts/auditar-kafka.mjs`: auditoría estática contra el checklist de
  `standards/mensajeria/kafka-avanzado.md`.
