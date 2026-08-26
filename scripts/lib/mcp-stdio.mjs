/**
 * Framing mínimo de JSON-RPC 2.0 sobre stdio para MCP: mensajes delimitados por
 * cabecera "Content-Length: N\r\n\r\n" seguida de N bytes de JSON (mismo esquema que LSP).
 * Implementación deliberadamente pequeña: sólo lo que el mock y su cliente de pruebas
 * necesitan (initialize, tools/list, tools/call), sin SDK externo.
 */

export function encodeMensaje(obj) {
  const json = JSON.stringify(obj);
  const bytes = Buffer.byteLength(json, "utf8");
  return `Content-Length: ${bytes}\r\n\r\n${json}`;
}

/** Lector incremental: alimentar con chunks de stdin, entrega mensajes completos ya parseados. */
export class LectorMcp {
  #buffer = Buffer.alloc(0);

  alimentar(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    const mensajes = [];
    for (;;) {
      const headerFin = this.#buffer.indexOf("\r\n\r\n");
      if (headerFin === -1) break;
      const header = this.#buffer.subarray(0, headerFin).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        // Cabecera corrupta: descartar hasta el separador y continuar.
        this.#buffer = this.#buffer.subarray(headerFin + 4);
        continue;
      }
      const len = Number(match[1]);
      const cuerpoInicio = headerFin + 4;
      if (this.#buffer.length < cuerpoInicio + len) break; // mensaje incompleto, esperar más datos
      const cuerpo = this.#buffer.subarray(cuerpoInicio, cuerpoInicio + len).toString("utf8");
      this.#buffer = this.#buffer.subarray(cuerpoInicio + len);
      try {
        mensajes.push(JSON.parse(cuerpo));
      } catch {
        // Mensaje no-JSON: se descarta silenciosamente.
      }
    }
    return mensajes;
  }
}
