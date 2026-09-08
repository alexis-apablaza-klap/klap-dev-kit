/klap:memoria-actualizar abono-ya

No hay acceso real al MCP de Klap Knowledge en este caso — simula que ya lo consultaste al
inicio del Flujo B, tal como indica `agents/documentador-klap.md`:

- `obtener_producto("abono-ya")` devolvió memoria existente con `metadata.revision: 5`.
- `estado_fuentes("abono-ya")` devolvió que la **única** fuente marcada como desalineada
  (`last_seen_updated_at` más nueva que `last_processed_at`) es la épica Jira `SVA-2100`; el
  resto de las épicas y todas las páginas de Confluence están al día.

**Nota adicional del equipo:** hay un issue cerrado hace tres meses (`SVA-1900`) que ya está
reflejado en memoria — no debería releerse.

Trabaja a partir de esta simulación, no inventes un escaneo distinto.
