import { spawn } from "node:child_process";
import { encodeMensaje, LectorMcp } from "./mcp-stdio.mjs";

/**
 * Cliente MCP stdio mínimo para uso desde scripts/CI, independiente de Claude Code.
 * Lanza el proceso indicado en `comando`, hace el handshake `initialize` y expone
 * `llamarTool(nombre, argumentos)`. Pensado para hablar con mocks/klap-knowledge-mcp
 * u otro servidor MCP stdio que respete el mismo framing.
 */
const TIMEOUT_MS = 10_000;

export class ClienteMcpStdio {
  #proceso;
  #lector = new LectorMcp();
  #pendientes = new Map();
  #siguienteId = 1;

  constructor(comando) {
    const [cmd, ...args] = comando;
    this.#proceso = spawn(cmd, args, { stdio: ["pipe", "pipe", "inherit"] });
    this.#proceso.stdout.on("data", (chunk) => {
      for (const msg of this.#lector.alimentar(chunk)) this.#recibir(msg);
    });
    this.#proceso.on("error", (err) => this.#rechazarTodas(err));
  }

  #recibir(msg) {
    const pendiente = this.#pendientes.get(msg.id);
    if (!pendiente) return;
    this.#pendientes.delete(msg.id);
    clearTimeout(pendiente.timeout);
    if (msg.error) pendiente.reject(new Error(msg.error.message ?? "Error MCP"));
    else pendiente.resolve(msg.result);
  }

  #rechazarTodas(err) {
    for (const [id, pendiente] of this.#pendientes) {
      clearTimeout(pendiente.timeout);
      pendiente.reject(err);
    }
    this.#pendientes.clear();
  }

  #enviar(method, params) {
    const id = this.#siguienteId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pendientes.delete(id);
        reject(new Error(`Timeout de ${TIMEOUT_MS}ms esperando respuesta MCP a "${method}" (id=${id}).`));
      }, TIMEOUT_MS);
      this.#pendientes.set(id, { resolve, reject, timeout });
      this.#proceso.stdin.write(encodeMensaje({ jsonrpc: "2.0", id, method, params }));
    });
  }

  async iniciar() {
    return this.#enviar("initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: { name: "klap-dev-kit-script-client", version: "0.1.0" },
      capabilities: {},
    });
  }

  async listarTools() {
    return this.#enviar("tools/list", {});
  }

  async llamarTool(nombre, argumentos) {
    return this.#enviar("tools/call", { name: nombre, arguments: argumentos });
  }

  cerrar() {
    this.#proceso.stdin.end();
    this.#proceso.kill();
  }
}
