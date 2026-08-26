#!/usr/bin/env node
/**
 * Coherencia interna del propio plugin: manifests parseables, índices que apuntan a
 * archivos reales, skills/agents con frontmatter válido. Gate de CI antes de publicar
 * una versión (§19). No valida contenido de negocio — sólo estructura.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { readYaml } from "./lib/yaml-io.mjs";
import { validar } from "./lib/schema-validate.mjs";
import { leerFrontmatter } from "./lib/frontmatter.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

function jsonValido(rutaAbsoluta) {
  try {
    JSON.parse(readFileSync(rutaAbsoluta, "utf8"));
    return true;
  } catch {
    return false;
  }
}

export function validarPlugin(root = resolveFromRoot()) {
  const problemas = [];

  // 1. plugin.json y marketplace.json
  for (const rel of ["plugin.json", "marketplace.json"]) {
    const p = path.join(root, ".claude-plugin", rel);
    if (!existsSync(p)) problemas.push(`Falta ${rel}`);
    else if (!jsonValido(p)) problemas.push(`${rel} no es JSON válido`);
  }

  // 2. .mcp.json
  const mcpPath = path.join(root, ".mcp.json");
  if (!existsSync(mcpPath)) problemas.push("Falta .mcp.json");
  else if (!jsonValido(mcpPath)) problemas.push(".mcp.json no es JSON válido");

  // 3. config/klap.yaml
  const config = readYaml(path.join(root, "config", "klap.yaml"));
  if (!config) {
    problemas.push("Falta config/klap.yaml");
  } else {
    const { valido, errores } = validar(path.join(root, "schemas", "klap-config.schema.json"), config);
    if (!valido) problemas.push(...errores.map((e) => `config/klap.yaml: ${e}`));
  }

  // 3b. contractVersion de schemas/knowledge-mcp/tools.json debe coincidir con
  // config/klap.yaml → contratos.knowledge_mcp — evita una ruptura silenciosa del contrato
  // cuando el servicio real de Klap Knowledge reemplace al mock (ver Etapa 3).
  const toolsJsonPath = path.join(root, "schemas", "knowledge-mcp", "tools.json");
  if (config && existsSync(toolsJsonPath)) {
    let contrato;
    try {
      contrato = JSON.parse(readFileSync(toolsJsonPath, "utf8"));
    } catch {
      contrato = null;
    }
    const versionContrato = contrato?.contractVersion;
    const versionRegistrada = config.contratos?.knowledge_mcp;
    if (!versionContrato) {
      problemas.push("schemas/knowledge-mcp/tools.json: falta contractVersion");
    } else if (!versionRegistrada) {
      problemas.push("config/klap.yaml: falta contratos.knowledge_mcp");
    } else if (versionContrato !== versionRegistrada) {
      problemas.push(
        `contractVersion desalineado: schemas/knowledge-mcp/tools.json=${versionContrato}, config/klap.yaml→contratos.knowledge_mcp=${versionRegistrada}`
      );
    }
  }

  // 4. Todos los .json bajo schemas/ deben parsear
  const schemasDir = path.join(root, "schemas");
  const recorrerJson = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) recorrerJson(p);
      else if (entry.name.endsWith(".json") && !jsonValido(p)) problemas.push(`Schema inválido: ${path.relative(root, p)}`);
    }
  };
  if (existsSync(schemasDir)) recorrerJson(schemasDir);

  // 5. standards/index.yaml
  const standardsIndexPath = path.join(root, "standards", "index.yaml");
  const standardsIndex = readYaml(standardsIndexPath);
  if (!standardsIndex) {
    problemas.push("Falta standards/index.yaml");
  } else {
    const { valido, errores } = validar(path.join(root, "schemas", "standards-index.schema.json"), standardsIndex);
    if (!valido) problemas.push(...errores.map((e) => `standards/index.yaml: ${e}`));
    for (const [clave, entrada] of Object.entries(standardsIndex)) {
      if (!entrada?.path) continue;
      const docPath = path.join(root, entrada.path);
      if (!existsSync(docPath)) {
        problemas.push(`standards/index.yaml: "${clave}" apunta a ${entrada.path}, que no existe`);
        continue;
      }
      const fm = leerFrontmatter(readFileSync(docPath, "utf8"));
      if (!fm?.obligatoriedad || !fm?.estado) {
        problemas.push(`${entrada.path}: falta obligatoriedad/estado en el frontmatter`);
      } else {
        if (fm.obligatoriedad !== entrada.obligatoriedad) {
          problemas.push(
            `"${clave}": obligatoriedad no coincide (index=${entrada.obligatoriedad}, doc=${fm.obligatoriedad})`
          );
        }
        if (fm.estado !== entrada.estado) {
          problemas.push(`"${clave}": estado no coincide (index=${entrada.estado}, doc=${fm.estado})`);
        }
      }
    }
  }

  // 6. skills/<n>/SKILL.md — frontmatter con name + description
  const skillsDir = path.join(root, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
      if (!existsSync(skillMd)) {
        problemas.push(`skills/${entry.name}/ no tiene SKILL.md`);
        continue;
      }
      const fm = leerFrontmatter(readFileSync(skillMd, "utf8"));
      if (!fm?.name || !fm?.description) {
        problemas.push(`skills/${entry.name}/SKILL.md: frontmatter incompleto (name/description)`);
      }
    }
  }

  // 7. agents/*.md — frontmatter con name + description
  const agentsDir = path.join(root, "agents");
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.name.endsWith(".md")) continue;
      const p = path.join(agentsDir, entry.name);
      const fm = leerFrontmatter(readFileSync(p, "utf8"));
      if (!fm?.name || !fm?.description) {
        problemas.push(`agents/${entry.name}: frontmatter incompleto (name/description)`);
      }
    }
  }

  // 8. hooks/hooks.json parsea y cada comando referencia un script existente
  const hooksPath = path.join(root, "hooks", "hooks.json");
  if (existsSync(hooksPath)) {
    if (!jsonValido(hooksPath)) {
      problemas.push("hooks/hooks.json no es JSON válido");
    } else {
      const hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
      const comandos = Object.values(hooks.hooks ?? {})
        .flat()
        .flatMap((h) => h.hooks ?? [])
        .map((h) => h.command);
      for (const cmd of comandos) {
        const match = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/.exec(cmd);
        if (match && !existsSync(path.join(root, match[1]))) {
          problemas.push(`hooks/hooks.json referencia un script inexistente: ${match[1]}`);
        }
      }
    }
  }

  // 9. templates/*.yaml deben parsear y validar contra su schema — son el primer ejemplo que
  // ve un equipo adoptando el kit; un YAML roto ahí no lo detecta ningún otro chequeo.
  const plantillasConSchema = [
    ["component.yaml", "component.schema.json"],
    ["context-index.yaml", "context-index.schema.json"],
  ];
  for (const [archivoTemplate, archivoSchema] of plantillasConSchema) {
    const templatePath = path.join(root, "templates", archivoTemplate);
    if (!existsSync(templatePath)) continue;
    let data;
    try {
      data = readYaml(templatePath);
    } catch (err) {
      problemas.push(`templates/${archivoTemplate}: YAML inválido — ${err.message}`);
      continue;
    }
    const { valido, errores } = validar(path.join(root, "schemas", archivoSchema), data);
    if (!valido) problemas.push(...errores.map((e) => `templates/${archivoTemplate}: ${e}`));
  }

  return { valido: problemas.length === 0, problemas };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const { valido, problemas } = validarPlugin();
  if (valido) {
    console.log("OK: klap-dev-kit es estructuralmente coherente.");
    process.exit(0);
  }
  console.error(`Se encontraron ${problemas.length} problema(s):`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}
