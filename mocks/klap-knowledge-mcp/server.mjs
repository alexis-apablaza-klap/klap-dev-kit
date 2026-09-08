#!/usr/bin/env node
/**
 * Mock stdio de Klap Knowledge MCP. Implementa el contrato de schemas/knowledge-mcp/tools.json
 * sirviendo fixtures locales, para desarrollar y testear el Dev-Kit sin depender del
 * servicio real. Framing JSON-RPC 2.0 con ndjson (un mensaje por línea, sin cabeceras
 * Content-Length — eso es LSP, no MCP).
 *
 * No representa cómo se implementará Klap Knowledge — sólo el contrato observable.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { encodeMensaje, LectorMcp } from "../../scripts/lib/mcp-stdio.mjs";
import { validarObjeto } from "../../scripts/lib/schema-validate.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fixture = (nombre) => JSON.parse(readFileSync(path.join(aqui, "fixtures", `${nombre}.json`), "utf8"));

const productos = fixture("productos");
const componentes = fixture("componentes");
const documentos = fixture("documentos");
const busqueda = fixture("busqueda");
const historialPorProducto = fixture("historial");
const fuentesPorProducto = fixture("fuentes");

// Estado in-memory de revisión por producto para aplicar_patch_memoria: seedeado desde el
// fixture y mutado sólo durante la vida del proceso — el mock no persiste a disco, es fiel al
// contrato (aplicar/rechazar por expected_revision), no a la arquitectura de storage real.
const revisionPorProducto = new Map(productos.map((p) => [p.id, p.revision ?? 1]));
const contrato = JSON.parse(
  readFileSync(path.join(aqui, "..", "..", "schemas", "knowledge-mcp", "tools.json"), "utf8")
);
const toolsContrato = contrato.tools;
const inputSchemaPorTool = new Map(toolsContrato.map((t) => [t.name, t.inputSchema]));

function normalizar(texto) {
  return (texto ?? "").toLowerCase();
}

const handlers = {
  producto_por_epica({ epica }) {
    for (const [productId, fuentes] of Object.entries(fuentesPorProducto)) {
      const match = fuentes?.jira?.epics?.some((e) => e.key === epica);
      if (match) {
        const p = productos.find((x) => x.id === productId);
        return { producto: p?.nombre ?? productId, product_id: productId, origen: "sources.jira.epics" };
      }
    }
    return { producto: null, product_id: null, origen: "sources.jira.epics" };
  },

  buscar_producto({ texto }) {
    const t = normalizar(texto);
    const resultados = productos
      .map((p) => {
        const hits = p.keywords.filter((k) => t.includes(k)).length;
        const nombreHit = t.includes(p.nombre) ? 1 : 0;
        const confianza = Math.min(1, (hits + nombreHit) / Math.max(1, p.keywords.length));
        return { nombre: p.nombre, confianza };
      })
      .filter((r) => r.confianza > 0)
      .sort((a, b) => b.confianza - a.confianza);
    return { productos: resultados };
  },

  resumen_producto({ producto }) {
    const p = productos.find((x) => x.nombre === producto);
    if (!p) return { producto, resumen: null, componentes: [], actualizado_en: null };
    return {
      producto: p.nombre,
      resumen: p.resumen,
      fase: p.fase,
      componentes: p.componentes,
      actualizado_en: "2026-08-01T00:00:00Z",
    };
  },

  resumen_componente({ componente }) {
    const c = componentes[componente];
    if (!c) return { componente, resumen: null, productos: [], dependencias: [] };
    return {
      componente,
      resumen: c.resumen,
      productos: c.productos,
      dependencias: c.dependencias,
      actualizado_en: "2026-08-01T00:00:00Z",
    };
  },

  buscar({ consulta, tipos, limite = 10 }) {
    const q = normalizar(consulta);
    let resultados = busqueda
      .map((b) => {
        const hits = b.keywords.filter((k) => q.includes(k)).length;
        return { tipo: b.tipo, titulo: b.titulo, extracto: b.extracto, relevancia: hits > 0 ? Math.min(1, hits / b.keywords.length) : 0 };
      })
      .filter((r) => r.relevancia > 0);
    if (tipos?.length) resultados = resultados.filter((r) => tipos.includes(r.tipo));
    resultados.sort((a, b) => b.relevancia - a.relevancia);
    return { resultados: resultados.slice(0, limite) };
  },

  documentos_relevantes({ consulta, componente }) {
    const q = normalizar(consulta);
    const docs = documentos
      .filter((d) => (componente ? d.componente === componente : true))
      .filter((d) => !consulta || d.tags.some((tag) => q.includes(tag)) || q.includes(normalizar(d.titulo)))
      .map((d) => ({ titulo: d.titulo, fuente: d.fuente, referencia: d.referencia, razon: componente ? `Asociado a ${componente}` : "Coincide con la consulta" }));
    return { documentos: docs };
  },

  obtener_producto({ producto }) {
    const p = productos.find((x) => x.nombre === producto || x.id === producto);
    if (!p) return { producto: null, business: null, ecosystem: null, technical: null, metadata: null };
    return {
      producto: { id: p.id, name: p.nombre, aliases: p.aliases ?? [], status: p.fase },
      business: p.business ?? null,
      ecosystem: p.ecosystem ?? null,
      technical: p.technical ?? null,
      metadata: p.metadata
        ? { ...p.metadata, revision: revisionPorProducto.get(p.id) ?? p.revision ?? 1 }
        : null,
    };
  },

  historial_producto({ producto, desde, hasta, limite = 50 }) {
    let eventos = historialPorProducto[producto] ?? [];
    if (desde) eventos = eventos.filter((e) => e.occurred_at >= desde);
    if (hasta) eventos = eventos.filter((e) => e.occurred_at <= hasta);
    eventos = [...eventos].sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1)).slice(0, limite);
    return { eventos };
  },

  estado_fuentes({ producto }) {
    return { fuentes: fuentesPorProducto[producto] ?? {} };
  },

  aplicar_patch_memoria({ product_id, expected_revision, operations }) {
    const previous_revision = revisionPorProducto.get(product_id) ?? 0;
    if (expected_revision !== previous_revision) {
      return {
        applied: false,
        product_id,
        previous_revision,
        new_revision: previous_revision,
        changed_files: [],
        rejected_reason: `expected_revision (${expected_revision}) no coincide con la revisión actual (${previous_revision})`,
      };
    }
    const new_revision = previous_revision + 1;
    revisionPorProducto.set(product_id, new_revision);
    const changed_files = [`products/${product_id}/product.yaml`];
    if (operations.some((op) => op.op === "append_event")) changed_files.push(`products/${product_id}/timeline.ndjson`);
    if (operations.some((op) => op.op === "upsert_document")) changed_files.push(`products/${product_id}/documents.yaml`);
    if (operations.some((op) => op.op === "upsert_source_state")) changed_files.push(`products/${product_id}/sources.yaml`);
    return { applied: true, product_id, previous_revision, new_revision, changed_files };
  },

  targeted_sync({ fuentes, motivo }) {
    const solicitud_id = randomUUID();
    process.stderr.write(
      `[mock-knowledge] targeted_sync solicitado — DEPRECATED, acuse degradado, no reprocesa nada ` +
        `(${solicitud_id}): ${fuentes.length} fuente(s) — ${motivo ?? "sin motivo"}\n`
    );
    return { aceptado: true, solicitud_id };
  },
};

function responder(id, result) {
  process.stdout.write(encodeMensaje({ jsonrpc: "2.0", id, result }));
}

function responderError(id, message, code = -32000) {
  process.stdout.write(encodeMensaje({ jsonrpc: "2.0", id, error: { code, message } }));
}

const lector = new LectorMcp();
process.stdin.on("data", (chunk) => {
  for (const msg of lector.alimentar(chunk)) {
    const { id, method, params } = msg;
    try {
      if (method === "initialize") {
        responder(id, {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "klap-knowledge-local-mock", version: "0.1.0" },
          capabilities: { tools: {} },
          // contractVersion se lee de schemas/knowledge-mcp/tools.json — nunca duplicar el
          // literal aquí, es la misma fuente que valida scripts/validar-plugin.mjs.
          contractVersion: contrato.contractVersion,
        });
      } else if (method === "tools/list") {
        responder(id, { tools: toolsContrato.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
      } else if (method === "tools/call") {
        const handler = handlers[params.name];
        if (!handler) throw new Error(`Tool desconocida: ${params.name}`);
        const args = params.arguments ?? {};
        const inputSchema = inputSchemaPorTool.get(params.name);
        if (inputSchema) {
          const { valido, errores } = validarObjeto(inputSchema, args);
          if (!valido) {
            responderError(id, `Argumentos inválidos para "${params.name}": ${errores.join("; ")}`, -32602);
            continue;
          }
        }
        const resultado = handler(args);
        responder(id, { content: [{ type: "text", text: JSON.stringify(resultado) }], structuredContent: resultado });
      } else {
        responder(id, {});
      }
    } catch (err) {
      responderError(id, err.message);
    }
  }
});
