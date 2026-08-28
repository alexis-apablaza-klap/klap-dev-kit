/**
 * Framing mínimo de JSON-RPC 2.0 sobre stdio para MCP: un mensaje JSON por línea,
 * delimitado por "\n" (ndjson) — el framing real del transporte stdio de MCP.
 * No confundir con LSP, que usa cabeceras "Content-Length"; MCP no las usa.
 * Implementación deliberadamente pequeña: sólo lo que el mock y su cliente de pruebas
 * necesitan (initialize, tools/list, tools/call), sin SDK externo.
 */

export function encodeMensaje(obj) {
  return `${JSON.stringify(obj)}\n`;
}

/** Lector incremental: alimentar con chunks de stdin, entrega mensajes completos ya parseados. */
export class LectorMcp {
  #buffer = "";

  alimentar(chunk) {
    this.#buffer += chunk.toString("utf8");
    const mensajes = [];
    for (;;) {
      const finLinea = this.#buffer.indexOf("\n");
      if (finLinea === -1) break;
      const linea = this.#buffer.slice(0, finLinea).trim();
      this.#buffer = this.#buffer.slice(finLinea + 1);
      if (!linea) continue;
      try {
        mensajes.push(JSON.parse(linea));
      } catch {
        // Línea no-JSON: se descarta silenciosamente.
      }
    }
    return mensajes;
  }
}
