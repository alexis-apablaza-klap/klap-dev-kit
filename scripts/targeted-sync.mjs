#!/usr/bin/env node
/**
 * [DEPRECATED] Solicita a Klap Knowledge un targeted-sync (reprocesamiento de fuentes
 * específicas) tras un cambio documental. Desde el contrato v2.0.0 la vía real de escritura es
 * `aplicar_patch_memoria` (ver agents/documentador-klap.md) — este script sólo queda como
 * acuse degradado mientras targeted_sync exista en el contrato (eliminación real prevista para
 * 3.0.0, ver schemas/knowledge-mcp/tools.json → no_lectura). No lo uses en flujos nuevos.
 *
 * Uso: node scripts/targeted-sync.mjs --fuente confluence:PAGE-123 [--motivo "texto"]
 *
 * Sólo funciona cuando config/klap.yaml define mcp.knowledge.mock_launch (desarrollo/CI).
 * En producción, esta solicitud la hace el skill/agente directamente contra el MCP real
 * dentro de la sesión de Claude Code — este script no simula ese llamado.
 */
import { cargarConfig } from "./lib/klap-config.mjs";
import { ClienteMcpStdio } from "./lib/mcp-client.mjs";
import { esPuntoDeEntrada } from "./lib/paths.mjs";

export function parsearFuentes(argv) {
  const fuentes = [];
  let motivo;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fuente") {
      const [tipo, ...resto] = argv[++i].split(":");
      fuentes.push({ tipo, referencia: resto.join(":") });
    } else if (argv[i] === "--motivo") {
      motivo = argv[++i];
    }
  }
  return { fuentes, motivo };
}

async function main() {
  const config = cargarConfig();
  const { fuentes, motivo } = parsearFuentes(process.argv.slice(2));

  if (fuentes.length === 0) {
    console.error("Debe indicar al menos un --fuente tipo:referencia");
    process.exit(1);
  }

  if (!config.mcp.knowledge.mock_launch) {
    console.error(
      "config/klap.yaml no define mcp.knowledge.mock_launch: en producción el targeted_sync " +
        "se solicita desde el skill/agente contra el MCP real dentro de la sesión, no vía CLI."
    );
    process.exit(2);
  }

  const cliente = new ClienteMcpStdio(config.mcp.knowledge.mock_launch);
  try {
    await cliente.iniciar();
    const resultado = await cliente.llamarTool("targeted_sync", { fuentes, motivo });
    console.log(JSON.stringify(resultado, null, 2));
    process.exit(resultado.structuredContent?.aceptado ? 0 : 1);
  } finally {
    cliente.cerrar();
  }
}

if (esPuntoDeEntrada(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
