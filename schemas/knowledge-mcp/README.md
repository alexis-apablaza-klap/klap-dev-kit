# Contrato Klap Knowledge MCP

`tools.json` es el único contrato que el Dev-Kit conoce de Klap Knowledge. Cualquier
servidor que lo implemente — el mock local en `mocks/klap-knowledge-mcp/` o el servicio
real cuando exista — es intercambiable sin tocar skills ni agentes. El nombre de servidor
activo se resuelve desde `config/klap.yaml` (`mcp.knowledge.server`).

Reglas:

- Todas las tools son de **lectura** excepto las listadas en `no_lectura`
  (`aplicar_patch_memoria` y, deprecado, `targeted_sync`).
- `aplicar_patch_memoria` es la **única vía real de escritura**: recibe un patch estructurado
  con evidencia por operación (ya generado por el agente `documentador-klap`, ver
  `agents/documentador-klap.md`) y lo valida/persiste. Nunca se escribe memoria organizacional
  de otra forma.
- `targeted_sync` queda **deprecated** desde `contractVersion 2.0.0` (`"deprecated": true` en
  su definición) — sigue respondiendo `{aceptado, solicitud_id}` como acuse degradado (no
  reprocesa nada) mientras los últimos consumidores migran a `aplicar_patch_memoria`.
  Eliminación real prevista para `3.0.0` — no eliminarla antes ni asumir que ya no responde.
- Si el servidor no está disponible y `mcp.knowledge.fallback_si_no_disponible` es `true`,
  las skills deben declarar explícitamente que el contexto es parcial y continuar con
  Jira + memoria del repo. Nunca inventar un resumen de producto/componente.
- `documentos_relevantes` devuelve punteros, no contenido — el contenido se resuelve
  después con el MCP de Atlassian, sólo si realmente hace falta.
- `obtener_producto` devuelve la memoria estructurada completa de un producto (identidad,
  negocio, ecosistema/relaciones, técnico, metadata de revisión); `resumen_producto` sigue
  siendo la versión condensada — úsala por defecto y sólo pide `obtener_producto` cuando la
  tarea necesita el detalle completo.
- `historial_producto` y `estado_fuentes` son de consulta explícita: no forman parte del
  recorrido por defecto de una HU — se usan cuando hace falta contexto histórico o cuando se
  va a ejecutar una actualización incremental de memoria y hay que decidir qué fuentes releer.
- `producto_por_epica` (desde `2.1.0`) resuelve el gate de producto de fase 1 de
  `/klap:trabajar-hu`: dado el `parent`/épica de la HU, busca en `sources.yaml` de cada
  producto y devuelve el que corresponde, o `producto: null` si ninguno la tiene registrada.
  Es determinista (cursores, no texto libre) — úsala antes de `buscar_producto`, que sigue
  siendo el fallback heurístico cuando la HU no tiene épica o la épica aún no está sincronizada.

## Cambio de contrato — protocolo

`tools.json` sólo se edita desde este repo, nunca desde `klap-dev-kit-knowledge` u otro
consumidor. Un cambio de contrato se coordina primero como propuesta documentada del lado que
lo necesita, y sólo después de aceptarse aquí (con `npm run validate` y `npm test` en verde,
`contractVersion` bumpeado junto con `config/klap.yaml → contratos.knowledge_mcp` en el mismo
commit) el servicio real lo implementa.
