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

- Confirmar con el equipo el contenido migrado desde `eco-team-brain` (`estado:
  requiere-revision` en `standards/index.yaml`).
- Reemplazar `klap-knowledge-local-mock` por el servicio real de Klap Knowledge cuando esté
  disponible (cambiar `config/klap.yaml` → `mcp.knowledge.modo: produccion`).
- Confirmar nombre de servidor MCP de SonarQube una vez esté desplegado.
