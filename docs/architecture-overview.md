# Arquitectura del kit

Dos productos separados. Este repo es sólo el primero:

```
Klap Dev-Kit (este repo)                          Klap Knowledge (servicio externo,
                                                     fuera de este repo)
┌─────────────────────────────┐
│ .claude-plugin/plugin.json   │
│                               │
│ skills/        → /klap:*     │
│ agents/        → analista,   │
│                  arquitecto,  │
│                  desarrollador,
│                  certificador,│
│                  seguridad,   │
│                  documentador │
│ hooks/         → validaciones │
│                  deterministas│
│ scripts/       → tests,      │
│                  coverage,    │
│                  secretos,     │
│                  deps-scan,    │
│                  quality-gate  │
│ standards/     → estándares   │
│                  Klap (índice) │
│ config/        → versiones,   │
│                  umbrales,     │
│                  nombres MCP   │
│ schemas/       → contratos     │
│   knowledge-mcp/tools.json ────┼──── contrato que el kit conoce (11 tools:
└──────────────┬────────────────┘      producto_por_epica, buscar_producto,
               │                        resumen_producto, resumen_componente, buscar,
               │ MCP (stdio, contrato   documentos_relevantes, obtener_producto,
               │ intercambiable)        historial_producto, estado_fuentes,
               │                        aplicar_patch_memoria, targeted_sync)
               │                                 │
               ▼                                 ▼
┌─────────────────────────────┐      ┌─────────────────────────────┐
│ mocks/klap-knowledge-mcp/     │      │  Servicio real de Klap        │
│ (servidor mock + fixtures,    │ ó    │  Knowledge — implementación   │
│  usado en dev/CI/pruebas)     │      │  interna no conocida por      │
│                                │      │  este kit (grafo, sync         │
│                                │      │  Jira/Confluence, etc.)        │
└─────────────────────────────┘      └─────────────────────────────┘
       modo: mock                            modo: produccion
       (config/klap.yaml → mcp.knowledge)
```

## La separación es literal, no sólo conceptual

El Dev-Kit **no tiene ningún código que hable de la implementación de Klap Knowledge**. Todo
lo que sabe es el contrato de `schemas/knowledge-mcp/tools.json`: once tools, todas de lectura
salvo las declaradas en `no_lectura` — `aplicar_patch_memoria` (única vía real de escritura,
patch estructurado con evidencia, la usa `agents/documentador-klap.md`) y, deprecada,
`targeted_sync` (acuse degradado, eliminación real prevista para `3.0.0`). Ninguna tool escribe
directo al almacenamiento interno de Klap Knowledge — eso es responsabilidad exclusiva del
servidor detrás del contrato. El servidor detrás de ese contrato es intercambiable cambiando
dos líneas en
`config/klap.yaml` (`mcp.knowledge.server` y `modo`); ningún skill ni agente referencia el
mock ni el servicio real por nombre.

## Cómo fluye una tarea real

```
/klap:trabajar-hu KLAP-123
        │
        ▼
  skills/trabajar-hu/SKILL.md   (orquestador — vive en este repo)
        │  invoca, fase por fase, pasando sólo el artefacto compacto
        ▼
  agents/analista.md → agents/arquitecto.md → agents/desarrollador.md
        → agents/certificador.md + agents/seguridad.md → agents/documentador.md
        → agents/documentador-klap.md (memoria global de producto, vía aplicar_patch_memoria)
        │
        ├── lee bajo demanda: standards/index.yaml, docs/context/index.yaml del repo
        ├── consulta: MCP Klap Knowledge (mock o real), MCP Atlassian (Jira/Confluence/
        │              Bitbucket, OAuth por dev — ver docs/atlassian-mcp.md), MCP SonarQube
        └── ejecuta: scripts/*.mjs para todo lo que debe ser determinista, no juicio del modelo
        │
        ▼
  hooks/hooks.json   → bloquea git commit con secretos, bloquea git push sin certificación,
                        valida docs/context/index.yaml al escribirlo
```

## Qué NO es parte de este repo

- Cualquier detalle de cómo Klap Knowledge sincroniza Jira/Confluence o mantiene su grafo.
- Cualquier acoplamiento a una base de datos específica de conocimiento (Neo4j u otra).
- Un CLI de instalación propio — el mecanismo nativo de plugins de Claude Code (marketplace +
  `plugin.json`) es suficiente; `bootstrap/` sólo prepara prerequisitos locales de
  certificación (Trivy, Dependency-Check), no instala el plugin en sí.
