# Klap Dev-Kit — instrucciones para Claude

Este archivo es deliberadamente corto. No repite lo que ya está en `standards/index.yaml`,
`schemas/` o cada `SKILL.md`/`agents/*.md` — ábrelos bajo demanda, nunca de entrada.

## Qué es esto

Plugin `klap`: estandariza el ciclo de desarrollo Klap vía `/klap:*`. El workflow principal es
`/klap:trabajar-hu <ISSUE-KEY>` (ver `skills/trabajar-hu/SKILL.md`).

## Progressive disclosure — regla dura

- Nunca cargues `standards/` completo. Lee `standards/index.yaml` (índice plano) y abre sólo
  las 1-3 entradas relevantes a la tarea actual.
- Nunca cargues toda la memoria de un componente. Lee `docs/context/index.yaml` del repo y
  abre sólo lo que ese índice marque relevante.
- Nunca consultes Confluence completo. Klap Knowledge (MCP) es la primera fuente de contexto
  organizacional; Confluence sólo cuando falte información o haya conflicto.

## Fuente de verdad de configuración

Versiones de stack, nombres de servidores MCP y umbrales de certificación viven en
`config/klap.yaml` y `config/quality-gates.yaml` — nunca los repitas ni los hardcodees en un
skill o agente; referencia el archivo.

## Klap Knowledge

Se consume exclusivamente vía el contrato de `schemas/knowledge-mcp/tools.json`. No asumas
Neo4j, Graphiti ni ningún detalle de implementación — el servidor activo (mock local o
servicio real) es intercambiable sin tocar skills ni agentes. Si no está disponible, decláralo
explícitamente y continúa con Jira + memoria del repo; nunca inventes un resumen.

## Validaciones

Lo determinista vive en `scripts/*.mjs` y `hooks/hooks.json`, no en el juicio del modelo. Si
existe un script para algo (tests, coverage, secretos, dependencias), invócalo — no lo
repliques razonando a mano.
