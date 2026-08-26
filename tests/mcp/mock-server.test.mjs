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

test("el mock de Klap Knowledge responde initialize y tools/list con las 6 tools reales", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    const init = await cliente.iniciar();
    assert.equal(init.serverInfo.name, "klap-knowledge-local-mock");

    const { tools } = await cliente.listarTools();
    const nombres = tools.map((t) => t.name).sort();
    assert.deepEqual(nombres, [
      "buscar",
      "buscar_producto",
      "documentos_relevantes",
      "resumen_componente",
      "resumen_producto",
      "targeted_sync",
    ]);
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

test("targeted_sync: resultado cumple su outputSchema y devuelve aceptado + solicitud_id", async () => {
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
