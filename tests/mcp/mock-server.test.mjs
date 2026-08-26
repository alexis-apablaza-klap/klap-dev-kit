import test from "node:test";
import assert from "node:assert/strict";
import { ClienteMcpStdio } from "../../scripts/lib/mcp-client.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const serverPath = resolveFromRoot("mocks", "klap-knowledge-mcp", "server.mjs");

test("el mock de Klap Knowledge responde initialize, tools/list y tools/call reales", async () => {
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

    const resultadoBusqueda = await cliente.llamarTool("buscar_producto", { texto: "anticipo de ventas del comercio" });
    const productos = resultadoBusqueda.structuredContent.productos;
    const abonoYa = productos.find((p) => p.nombre === "abono-ya");
    assert.ok(abonoYa, `No se encontró abono-ya entre: ${JSON.stringify(productos)}`);
    assert.ok(abonoYa.confianza > 0);

    const resumen = await cliente.llamarTool("resumen_componente", { componente: "ms-central-sva-anticipo-calculos" });
    assert.ok(resumen.structuredContent.resumen.length > 0);
    assert.ok(resumen.structuredContent.productos.includes("abono-ya"));
  } finally {
    cliente.cerrar();
  }
});

test("targeted_sync del mock devuelve aceptado + solicitud_id", async () => {
  const cliente = new ClienteMcpStdio(["node", serverPath]);
  try {
    await cliente.iniciar();
    const resultado = await cliente.llamarTool("targeted_sync", {
      fuentes: [{ tipo: "component-yaml", referencia: "ms-central-sva-anticipo-calculos/component.yaml" }],
      motivo: "test",
    });
    assert.equal(resultado.structuredContent.aceptado, true);
    assert.ok(typeof resultado.structuredContent.solicitud_id === "string" && resultado.structuredContent.solicitud_id.length > 0);
  } finally {
    cliente.cerrar();
  }
});
