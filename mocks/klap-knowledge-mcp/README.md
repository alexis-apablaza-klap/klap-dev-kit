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

- `productos.json` — productos Klap y palabras clave para `buscar_producto`.
- `componentes.json` — memoria resumida por componente.
- `documentos.json` — punteros a Confluence/ADR para `documentos_relevantes`.
- `busqueda.json` — contenido indexado para `buscar`.

Editar estos archivos para ampliar los escenarios de prueba — no requieren reiniciar
nada más que el proceso del servidor.
