# Mock de Klap Knowledge MCP

Servidor MCP stdio en Node (sin dependencias externas) que implementa el contrato de
`schemas/knowledge-mcp/tools.json` sirviendo los fixtures de `fixtures/*.json`.

Se registra automáticamente al instalar el plugin (`.mcp.json` en la raíz, servidor
`klap-knowledge-local-mock`). `config/klap.yaml` (`mcp.knowledge`) apunta a este servidor
mientras `modo: mock`; el día que exista el servicio real basta con cambiar `server` y
`modo: produccion` ahí — ningún skill ni agente referencia el mock directamente.

## Uso manual (fuera de Claude Code)

```bash
node mocks/klap-knowledge-mcp/server.mjs
```

Habla JSON-RPC 2.0 con framing ndjson (un mensaje por línea, sin cabeceras
`Content-Length` — eso es LSP, no MCP) por stdin/stdout. `scripts/lib/mcp-client.mjs`
implementa un cliente mínimo para el mismo framing, usado por `scripts/targeted-sync.mjs`
y por `tests/mcp/`.

## Fixtures

- `productos.json` — productos Klap, palabras clave para `buscar_producto`, y memoria
  estructurada (`negocio`/`ecosistema`/`tecnico`/`metadata`/`revision`) para `obtener_producto`
  y `aplicar_patch_memoria`.
- `componentes.json` — memoria resumida por componente.
- `documentos.json` — punteros a Confluence/ADR para `documentos_relevantes`.
- `busqueda.json` — contenido indexado para `buscar`.
- `historial.json` — eventos por producto para `historial_producto`.
- `fuentes.json` — cursores de sincronización por producto para `estado_fuentes`.

Editar estos archivos para ampliar los escenarios de prueba — no requieren reiniciar
nada más que el proceso del servidor.

## `aplicar_patch_memoria` en el mock

La revisión por producto se seedea desde `productos.json` (`revision`) y se mantiene sólo en
memoria del proceso — el mock no persiste a disco. Sirve para probar el ciclo optimista
(`expected_revision` vs `previous_revision`/`new_revision`), no como referencia de storage real
(eso lo define `klap-dev-kit-knowledge`, nunca este mock).
