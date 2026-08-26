import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parse, stringify } from "yaml";

export function readYaml(filePath) {
  if (!existsSync(filePath)) return null;
  return parse(readFileSync(filePath, "utf8"));
}

export function writeYaml(filePath, data) {
  writeFileSync(filePath, stringify(data), "utf8");
}
