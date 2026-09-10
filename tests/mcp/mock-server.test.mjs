import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ClienteMcpStdio } from "../../scripts/lib/mcp-client.mjs";
import { validarObjeto } from "../../scripts/lib/schema-validate.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const serverPath = resolveFromRoot("mocks", "klap-knowledge-mcp", "server.mjs");
const contrato = JSON.parse(
  readFileSync(resolveFromRoot("schemas", "knowledge-mcp", "tools.json"), "utf8")
).tools;
const outputSchemaPorTool = new Map(contrato.map((t) => [t.name, t.outputSchema]));

function validarContraOutputSchema(nombreTool, structuredContent) {
  const schema = outputSchemaPorTool.get(nombreTool);
  assert.ok(schema, `No hay outputSchema declarado para "${nombreTool}"`);
  const { valido, errores } = validarObjeto(schema, structuredContent);
  assert.ok(valido, `"${nombreTool}" no cumple su outputSchema: ${errores.join("; ")}`);
}

test("el mock de Klap Knowledge responde initialize y tools/list con las 11 tools reales", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    const init = await cliente.iniciar();
    assert.equal(init.serverInfo.name, "klap-knowledge-local-mock");

    const { tools } = await cliente.listarTools();
    const nombres = tools.map((t) => t.name).sort();
    assert.deepEqual(nombres, [
      "aplicar_patch_memoria",
      "buscar",
      "buscar_producto",
      "documentos_relevantes",
      "estado_fuentes",
      "historial_producto",
      "obtener_producto",
      "producto_por_epica",
      "resumen_componente",
      "resumen_producto",
      "targeted_sync",
    ]);
  } finally {
    cliente.cerrar();
  }
});

test("producto_por_epica: épica registrada resuelve al producto correcto", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("producto_por_epica", { epica: "SVA-1000" });
    validarContraOutputSchema("producto_por_epica", r.structuredContent);
    assert.equal(r.structuredContent.producto, "abono-ya");
    assert.equal(r.structuredContent.product_id, "abono-ya");
  } finally {
    cliente.cerrar();
  }
});

test("producto_por_epica: distingue entre productos con épicas distintas", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("producto_por_epica", { epica: "IMP-500" });
    validarContraOutputSchema("producto_por_epica", r.structuredContent);
    assert.equal(r.structuredContent.producto, "impulso-klap");
  } finally {
    cliente.cerrar();
  }
});

test("producto_por_epica: épica no registrada en ningún producto devuelve producto null", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("producto_por_epica", { epica: "NUEVO-1" });
    validarContraOutputSchema("producto_por_epica", r.structuredContent);
    assert.equal(r.structuredContent.producto, null);
    assert.equal(r.structuredContent.product_id, null);
  } finally {
    cliente.cerrar();
  }
});

test("buscar_producto: resultado cumple su outputSchema y encuentra abono-ya", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("buscar_producto", { texto: "anticipo de ventas del comercio" });
    validarContraOutputSchema("buscar_producto", r.structuredContent);
    const abonoYa = r.structuredContent.productos.find((p) => p.nombre === "abono-ya");
    assert.ok(abonoYa, `No se encontró abono-ya entre: ${JSON.stringify(r.structuredContent.productos)}`);
    assert.ok(abonoYa.confianza > 0);
  } finally {
    cliente.cerrar();
  }
});

test("resumen_producto: resultado cumple su outputSchema para un producto real", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("resumen_producto", { producto: "abono-ya" });
    validarContraOutputSchema("resumen_producto", r.structuredContent);
    assert.equal(r.structuredContent.producto, "abono-ya");
    assert.ok(r.structuredContent.resumen.length > 0);
    assert.ok(r.structuredContent.componentes.includes("ms-central-sva-anticipo-calculos"));
  } finally {
    cliente.cerrar();
  }
});

test("resumen_componente: resultado cumple su outputSchema para un componente real", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("resumen_componente", { componente: "ms-central-sva-anticipo-calculos" });
    validarContraOutputSchema("resumen_componente", r.structuredContent);
    assert.ok(r.structuredContent.resumen.length > 0);
    assert.ok(r.structuredContent.productos.includes("abono-ya"));
  } finally {
    cliente.cerrar();
  }
});

test("buscar: resultado cumple su outputSchema y respeta el filtro de tipos", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("buscar", { consulta: "conciliacion contable", tipos: ["proceso"] });
    validarContraOutputSchema("buscar", r.structuredContent);
    assert.ok(r.structuredContent.resultados.length > 0);
    assert.ok(r.structuredContent.resultados.every((res) => res.tipo === "proceso"));
  } finally {
    cliente.cerrar();
  }
});

test("documentos_relevantes: resultado cumple su outputSchema para un componente real", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("documentos_relevantes", {
      consulta: "liquidacion",
      componente: "ms-central-sva-anticipo-calculos",
    });
    validarContraOutputSchema("documentos_relevantes", r.structuredContent);
    assert.ok(r.structuredContent.documentos.length > 0);
  } finally {
    cliente.cerrar();
  }
});

test("targeted_sync: resultado cumple su outputSchema y devuelve aceptado + solicitud_id (deprecated)", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("targeted_sync", {
      fuentes: [{ tipo: "component-yaml", referencia: "ms-central-sva-anticipo-calculos/component.yaml" }],
      motivo: "test",
    });
    validarContraOutputSchema("targeted_sync", r.structuredContent);
    assert.equal(r.structuredContent.aceptado, true);
    assert.ok(typeof r.structuredContent.solicitud_id === "string" && r.structuredContent.solicitud_id.length > 0);
    assert.ok(
      contrato.find((t) => t.name === "targeted_sync").deprecated,
      "targeted_sync debe seguir marcada deprecated en el contrato mientras responda"
    );
  } finally {
    cliente.cerrar();
  }
});

test("obtener_producto: resultado cumple su outputSchema y trae memoria estructurada completa", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("obtener_producto", { producto: "abono-ya" });
    validarContraOutputSchema("obtener_producto", r.structuredContent);
    assert.equal(r.structuredContent.producto.id, "abono-ya");
    assert.ok(r.structuredContent.business.description.length > 0);
    assert.ok(r.structuredContent.technical.components.some((c) => c.component_id === "ms-central-sva-anticipo-calculos"));
  } finally {
    cliente.cerrar();
  }
});

test("obtener_producto: producto inexistente devuelve producto null sin inventar memoria", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("obtener_producto", { producto: "no-existe" });
    validarContraOutputSchema("obtener_producto", r.structuredContent);
    assert.equal(r.structuredContent.producto, null);
  } finally {
    cliente.cerrar();
  }
});

test("historial_producto: resultado cumple su outputSchema y respeta el límite", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("historial_producto", { producto: "abono-ya", limite: 1 });
    validarContraOutputSchema("historial_producto", r.structuredContent);
    assert.equal(r.structuredContent.eventos.length, 1);
    assert.equal(r.structuredContent.eventos[0].event_id, "evt:abono-ya:2026-08-01-liquidacion");
  } finally {
    cliente.cerrar();
  }
});

test("estado_fuentes: resultado cumple su outputSchema para un producto con cursores", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("estado_fuentes", { producto: "abono-ya" });
    validarContraOutputSchema("estado_fuentes", r.structuredContent);
    assert.ok(r.structuredContent.fuentes.jira.epics.length > 0);
  } finally {
    cliente.cerrar();
  }
});

test("aplicar_patch_memoria: patch válido con expected_revision correcto se aplica y sube la revisión", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const antes = await cliente.llamarTool("obtener_producto", { producto: "impulso-klap" });
    const revisionPrevia = antes.structuredContent.metadata.revision;
    const r = await cliente.llamarTool("aplicar_patch_memoria", {
      product_id: "impulso-klap",
      expected_revision: revisionPrevia,
      generated_by: { agent: "documentador-klap" },
      operations: [
        {
          op: "append_event",
          value: {
            event_id: "evt:impulso-klap:test",
            occurred_at: "2026-09-08T00:00:00Z",
            type: "documentation_change",
            summary: "Evento de prueba.",
            sources: [{ type: "manual", ref: "test" }],
            created_by: "documentador-klap",
          },
        },
      ],
    });
    validarContraOutputSchema("aplicar_patch_memoria", r.structuredContent);
    assert.equal(r.structuredContent.applied, true);
    assert.equal(r.structuredContent.previous_revision, revisionPrevia);
    assert.equal(r.structuredContent.new_revision, revisionPrevia + 1);
    assert.ok(r.structuredContent.changed_files.includes("products/impulso-klap/timeline.ndjson"));
  } finally {
    cliente.cerrar();
  }
});

test("aplicar_patch_memoria: expected_revision desalineado se rechaza sin aplicar", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("aplicar_patch_memoria", {
      product_id: "cuota-comercio",
      expected_revision: 999,
      generated_by: { agent: "documentador-klap" },
      operations: [{ op: "update_business", value: { description: "x", sources: [{ type: "manual", ref: "test" }] } }],
    });
    validarContraOutputSchema("aplicar_patch_memoria", r.structuredContent);
    assert.equal(r.structuredContent.applied, false);
    assert.ok(r.structuredContent.rejected_reason.length > 0);
  } finally {
    cliente.cerrar();
  }
});

test("aplicar_patch_memoria: rechaza un patch con una operación fuera de forma (inputSchema)", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    await assert.rejects(
      () =>
        cliente.llamarTool("aplicar_patch_memoria", {
          product_id: "cuota-comercio",
          expected_revision: 1,
          generated_by: { agent: "documentador-klap" },
          operations: [{ op: "operacion_inexistente", value: {} }],
        }),
      /Argumentos inválidos/
    );
  } finally {
    cliente.cerrar();
  }
});

test("caso negativo: llamar una tool con argumentos que violan su inputSchema se rechaza (Invalid params)", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    await assert.rejects(
      () => cliente.llamarTool("resumen_producto", {}), // falta el "producto" requerido
      /Argumentos inválidos/
    );
  } finally {
    cliente.cerrar();
  }
});

test("caso negativo: llamar una tool desconocida se rechaza", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    await assert.rejects(() => cliente.llamarTool("tool_que_no_existe", {}), /Tool desconocida/);
  } finally {
    cliente.cerrar();
  }
});

test("resumen_producto: omite los componentes deprecados por defecto y los incluye con incluir_deprecados", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const porDefecto = await cliente.llamarTool("resumen_producto", { producto: "abono-ya" });
    validarContraOutputSchema("resumen_producto", porDefecto.structuredContent);
    assert.ok(!porDefecto.structuredContent.componentes.includes("mcs-anticipo-batch-nocturno"));

    const conDeprecados = await cliente.llamarTool("resumen_producto", {
      producto: "abono-ya",
      incluir_deprecados: true,
    });
    validarContraOutputSchema("resumen_producto", conDeprecados.structuredContent);
    assert.ok(conDeprecados.structuredContent.componentes.includes("mcs-anticipo-batch-nocturno"));
  } finally {
    cliente.cerrar();
  }
});

test("resumen_componente: declara el status del componente (2.4.0)", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const vigente = await cliente.llamarTool("resumen_componente", { componente: "ms-central-sva-anticipo-calculos" });
    validarContraOutputSchema("resumen_componente", vigente.structuredContent);
    assert.equal(vigente.structuredContent.status, "active");

    const retirado = await cliente.llamarTool("resumen_componente", { componente: "mcs-anticipo-batch-nocturno" });
    validarContraOutputSchema("resumen_componente", retirado.structuredContent);
    assert.equal(retirado.structuredContent.status, "deprecated");
  } finally {
    cliente.cerrar();
  }
});

test("buscar: un resultado deprecado se declara pero no se excluye del índice", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const r = await cliente.llamarTool("buscar", { consulta: "batch nocturno anticipo" });
    validarContraOutputSchema("buscar", r.structuredContent);
    const retirado = r.structuredContent.resultados.find((res) => res.titulo.includes("Batch nocturno"));
    assert.ok(retirado, "el componente retirado debe seguir apareciendo en la búsqueda");
    assert.equal(retirado.status, "deprecated");
  } finally {
    cliente.cerrar();
  }
});

test("aplicar_patch_memoria: upsert_document toca documents.ndjson y el cursor toca sources.yaml", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const antes = await cliente.llamarTool("obtener_producto", { producto: "abono-ya" });
    const r = await cliente.llamarTool("aplicar_patch_memoria", {
      product_id: "abono-ya",
      expected_revision: antes.structuredContent.metadata.revision,
      generated_by: { agent: "documentador-klap" },
      operations: [
        {
          op: "upsert_document",
          value: {
            document_id: "confluence:3240263803",
            source_type: "confluence",
            source_ref: "CONFLUENCE-SPACE-ABY-101",
            title: "Definición de negocio: Abono Ya",
            summary: "Resumen de la definición de negocio.",
            topics: ["negocio", "anticipo"],
            source_version: "4",
            source_updated_at: "2026-09-01T00:00:00Z",
            last_processed_at: "2026-09-10T00:00:00Z",
          },
        },
        {
          op: "upsert_source_state",
          value: {
            confluence: {
              pages: { "CONFLUENCE-SPACE-ABY-101": { version: "4", updated_at: "2026-09-01T00:00:00Z" } },
            },
          },
        },
      ],
    });
    validarContraOutputSchema("aplicar_patch_memoria", r.structuredContent);
    assert.equal(r.structuredContent.applied, true);
    // La memoria real nunca tuvo documents.yaml: el mock reportaba una ruta inexistente.
    assert.ok(r.structuredContent.changed_files.includes("products/abono-ya/documents.ndjson"));
    assert.ok(r.structuredContent.changed_files.includes("products/abono-ya/sources.yaml"));
  } finally {
    cliente.cerrar();
  }
});

test("aplicar_patch_memoria: las tres operaciones de baja del contrato 2.4.0 se aceptan", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const antes = await cliente.llamarTool("obtener_producto", { producto: "abono-ya" });
    const r = await cliente.llamarTool("aplicar_patch_memoria", {
      product_id: "abono-ya",
      expected_revision: antes.structuredContent.metadata.revision,
      generated_by: { agent: "documentador-klap" },
      operations: [
        { op: "remove_identity_alias", value: { alias: "abonoya" } },
        {
          op: "remove_component_dependency",
          value: {
            component_id: "ms-central-sva-anticipo-calculos",
            depends_on_component_id: "mc-tlog",
            type: "depends_on",
          },
        },
        { op: "remove_component_link", value: { component_id: "mcs-anticipo-batch-nocturno" } },
        { op: "remove_component", value: { component_id: "mcs-anticipo-batch-nocturno" } },
      ],
    });
    validarContraOutputSchema("aplicar_patch_memoria", r.structuredContent);
    assert.equal(r.structuredContent.applied, true);
    // El archivo del componente desaparece: la baja se refleja en changed_files igual que el alta.
    assert.ok(r.structuredContent.changed_files.includes("components/mcs-anticipo-batch-nocturno.yaml"));
    assert.ok(r.structuredContent.changed_files.includes("catalog.yaml"));
  } finally {
    cliente.cerrar();
  }
});
