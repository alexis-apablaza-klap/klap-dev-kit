# Contrato Klap Knowledge MCP

`tools.json` es el único contrato que el Dev-Kit conoce de Klap Knowledge. Cualquier
servidor que lo implemente — el mock local en `mocks/klap-knowledge-mcp/` o el servicio
real cuando exista — es intercambiable sin tocar skills ni agentes. El nombre de servidor
activo se resuelve desde `config/klap.yaml` (`mcp.knowledge.server`).

Reglas:

- Todas las tools son de **lectura**, excepto `targeted_sync`, que es una **solicitud** de
  reprocesamiento — nunca una escritura directa al grafo (ver `standards/arquitectura`).
- Si el servidor no está disponible y `mcp.knowledge.fallback_si_no_disponible` es `true`,
  las skills deben declarar explícitamente que el contexto es parcial y continuar con
  Jira + memoria del repo. Nunca inventar un resumen de producto/componente.
- `documentos_relevantes` devuelve punteros, no contenido — el contenido se resuelve
  después con el MCP de Atlassian, sólo si realmente hace falta.
