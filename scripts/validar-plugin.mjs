#!/usr/bin/env node
/**
 * Coherencia interna del propio plugin: manifests parseables, índices que apuntan a
 * archivos reales, skills/agents con frontmatter válido. Gate de CI antes de publicar
 * una versión (§19). No valida contenido de negocio — sólo estructura.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

  // 1. plugin.json y marketplace.json — existen, parsean, y traen los campos que
  // `claude plugin validate --strict` exige. Ese validador oficial no corre en CI (requiere el
  // CLI instalado en el runner), así que sin este chequeo un manifest incompleto sólo se
  // descubre cuando alguien lo valida a mano — que fue exactamente lo que pasó con la
  // `description` faltante del marketplace.
  const CAMPOS_MINIMOS_MANIFEST = { "plugin.json": ["name", "description"], "marketplace.json": ["name", "description"] };
  for (const rel of ["plugin.json", "marketplace.json"]) {
    const p = path.join(root, ".claude-plugin", rel);
    if (!existsSync(p)) problemas.push(`Falta ${rel}`);
    else if (!jsonValido(p)) problemas.push(`${rel} no es JSON válido`);
    else {
      const manifest = JSON.parse(readFileSync(p, "utf8"));
      for (const campo of CAMPOS_MINIMOS_MANIFEST[rel]) {
        if (!manifest[campo]) problemas.push(`${rel}: falta "${campo}" (lo exige claude plugin validate --strict)`);
      }
    }
  }

  // 1b. Versión del plugin: `.claude-plugin/plugin.json` y `package.json` deben declarar la
  // misma cadena, y el CHANGELOG debe tener una entrada para ella. Sin este chequeo las dos
  // versiones derivan en silencio — que fue exactamente lo que pasó (plugin.json=0.3.0 mientras
  // package.json=0.1.0, sin ningún tag). Es el mismo patrón del chequeo 3b para el contrato: dos
  // archivos que declaran lo mismo se cruzan, no se confía en que alguien los mueva juntos.
  // Ojo: esta versión es el eje del *plugin*, independiente del contractVersion de Klap Knowledge
  // (3b) y de la versión del servicio klap-dev-kit-knowledge. Ver docs/installation.md.
  const pluginJsonPath = path.join(root, ".claude-plugin", "plugin.json");
  const packageJsonPath = path.join(root, "package.json");
  if (existsSync(pluginJsonPath) && existsSync(packageJsonPath) && jsonValido(pluginJsonPath) && jsonValido(packageJsonPath)) {
    const versionPlugin = JSON.parse(readFileSync(pluginJsonPath, "utf8")).version;
    const versionPaquete = JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
    if (!versionPlugin) problemas.push('plugin.json: falta "version"');
    else if (!versionPaquete) problemas.push('package.json: falta "version"');
    else if (versionPlugin !== versionPaquete) {
      problemas.push(
        `versión desalineada: .claude-plugin/plugin.json=${versionPlugin}, package.json=${versionPaquete}`
      );
    } else {
      const changelogPath = path.join(root, "CHANGELOG.md");
      if (!existsSync(changelogPath)) problemas.push("Falta CHANGELOG.md");
      else if (!readFileSync(changelogPath, "utf8").includes(`## [${versionPlugin}]`)) {
        problemas.push(`CHANGELOG.md: no tiene entrada "## [${versionPlugin}]" para la versión declarada`);
      }
    }
  }

  // 2. .mcp.json — además de existir y parsear, no puede contener rutas absolutas: el archivo
  // viaja con el plugin a la máquina de cada dev, así que una ruta como C:\...\python.exe o
  // /home/alguien/... sólo funciona en el equipo de quien la escribió. Lo portable es
  // ${CLAUDE_PLUGIN_ROOT} para lo que vive dentro del plugin y ${VAR}/${VAR:-default} para lo
  // que depende del entorno de cada persona.
  const mcpPath = path.join(root, ".mcp.json");
  if (!existsSync(mcpPath)) problemas.push("Falta .mcp.json");
  else if (!jsonValido(mcpPath)) problemas.push(".mcp.json no es JSON válido");
  else {
    const crudo = readFileSync(mcpPath, "utf8");
    const RUTA_ABSOLUTA = /"[^"]*(?:[A-Za-z]:\\\\|\/(?:home|Users)\/)[^"]*"/g;
    for (const hallazgo of crudo.match(RUTA_ABSOLUTA) ?? []) {
      problemas.push(
        `.mcp.json contiene una ruta absoluta (${hallazgo.trim()}) — no es portable entre máquinas; usa \${CLAUDE_PLUGIN_ROOT} o una variable de entorno`
      );
    }
  }

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

  // 3c. config/quality-gates.yaml — v1 (bloquear_si como strings de expresión) ya no es
  // soportado; un archivo en formato viejo debe fallar acá, no en runtime durante una
  // certificación real (ver scripts/lib/gates.mjs).
  const gatesPath = path.join(root, "config", "quality-gates.yaml");
  const gates = readYaml(gatesPath);
  if (!gates) {
    problemas.push("Falta config/quality-gates.yaml");
  } else {
    const { valido, errores } = validar(path.join(root, "schemas", "quality-gates.schema.json"), gates);
    if (!valido) problemas.push(...errores.map((e) => `config/quality-gates.yaml: ${e}`));
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

  // 7. agents/*.md — frontmatter con name + description, least privilege (tools/disallowedTools
  // declarado explícitamente, nunca heredar todo por omisión) y ningún campo que un agente de
  // plugin ignora en silencio (mcpServers/hooks/permissionMode sólo aplican a agentes de
  // proyecto/usuario — ver docs oficial de subagentes).
  const CAMPOS_IGNORADOS_EN_PLUGIN = ["mcpServers", "hooks", "permissionMode"];
  const agentsDir = path.join(root, "agents");
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.name.endsWith(".md")) continue;
      const p = path.join(agentsDir, entry.name);
      const fm = leerFrontmatter(readFileSync(p, "utf8"));
      if (!fm?.name || !fm?.description) {
        problemas.push(`agents/${entry.name}: frontmatter incompleto (name/description)`);
        continue;
      }
      if (!fm.tools && !fm.disallowedTools) {
        problemas.push(
          `agents/${entry.name}: no declara tools ni disallowedTools — hereda todas las tools de la sesión por omisión (least privilege, ver propuesta #1)`
        );
      }
      for (const campo of CAMPOS_IGNORADOS_EN_PLUGIN) {
        if (fm[campo] !== undefined) {
          problemas.push(`agents/${entry.name}: declara "${campo}", que se ignora en silencio para agentes de plugin`);
        }
      }
      // 7a-bis. Un veto de shell tiene que nombrar TODAS las shells, o no veta nada: `Bash` y
      // `PowerShell` son tools distintas con la misma capacidad, y un denylist es tan fuerte
      // como su entrada más floja. El modo de fallo es silencioso — el agente parece de sólo
      // lectura, el frontmatter dice que lo es, y escribe igual — así que la regla se decide
      // acá y no en el juicio de quien edite un agente.
      const shells = ["Bash", "PowerShell"];
      const vetadas = String(fm.disallowedTools ?? "")
        .split(",")
        .map((t) => t.trim());
      const shellsVetadas = shells.filter((sh) => vetadas.includes(sh));
      if (shellsVetadas.length > 0 && shellsVetadas.length < shells.length) {
        const faltan = shells.filter((sh) => !vetadas.includes(sh));
        problemas.push(
          `agents/${entry.name}: veta ${shellsVetadas.join(", ")} pero no ${faltan.join(", ")} — ` +
            `un veto de shell parcial no impide nada, el agente conserva la capacidad por la otra tool`
        );
      }

      // 7b. El frontmatter es la única excepción a "nunca hardcodees el nombre de un servidor
      // MCP" (CLAUDE.md): se evalúa antes de que el agente pueda leer config/klap.yaml, así que
      // una tool MCP sólo puede nombrarse literalmente. Este chequeo mantiene la fuente de
      // verdad: si mcp.atlassian.server cambia en config/klap.yaml, los agentes fallan aquí en
      // vez de quedarse con un disallowedTools que ya no matchea nada — un permiso muerto que
      // no rompe nada visible y deja escritura abierta en un agente de sólo lectura.
      // Sin config/klap.yaml no hay fuente de verdad contra la cual cruzar — ese caso ya lo
      // reporta el chequeo 3, no tiene sentido acusar además a cada agente.
      const serverAtlassian = config?.mcp?.atlassian?.server;
      const declaradas = serverAtlassian ? String(fm.disallowedTools ?? fm.tools ?? "") : "";
      for (const tool of declaradas.split(",").map((t) => t.trim())) {
        const match = /^mcp__(.+?)__/.exec(tool);
        if (match && match[1] !== serverAtlassian && match[1] !== config?.mcp?.knowledge?.server) {
          problemas.push(
            `agents/${entry.name}: la tool "${tool}" nombra el servidor MCP "${match[1]}", que no coincide con config/klap.yaml (mcp.atlassian.server=${serverAtlassian})`
          );
        }
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
  const plantillasConSchema = [["context-index.yaml", "context-index.schema.json"]];
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
