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
│   knowledge-mcp/tools.json ────┼──── contrato que el kit conoce
└──────────────┬────────────────┘      (buscar_producto, resumen_producto,
               │                        resumen_componente, buscar,
               │ MCP (stdio, contrato   documentos_relevantes, targeted_sync)
               │ intercambiable)                 │
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
lo que sabe es el contrato de `schemas/knowledge-mcp/tools.json`: seis tools, todas de lectura
salvo `targeted_sync`, que es una solicitud de reprocesamiento — nunca una escritura directa.
El servidor detrás de ese contrato es intercambiable cambiando dos líneas en
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
        │
        ├── lee bajo demanda: standards/index.yaml, docs/context/index.yaml del repo
        ├── consulta: MCP Klap Knowledge (mock o real), MCP Atlassian, MCP SonarQube
        └── ejecuta: scripts/*.mjs para todo lo que debe ser determinista, no juicio del modelo
        │
        ▼
  hooks/hooks.json   → bloquea git commit con secretos, bloquea git push sin certificación,
                        valida component.yaml/index.yaml al escribirlos
```

## Qué NO es parte de este repo

- Cualquier detalle de cómo Klap Knowledge sincroniza Jira/Confluence o mantiene su grafo.
- Cualquier acoplamiento a una base de datos específica de conocimiento (Neo4j u otra).
- Un CLI de instalación propio — el mecanismo nativo de plugins de Claude Code (marketplace +
  `plugin.json`) es suficiente; `bootstrap/` sólo prepara prerequisitos locales de
  certificación (Trivy, Dependency-Check), no instala el plugin en sí.
