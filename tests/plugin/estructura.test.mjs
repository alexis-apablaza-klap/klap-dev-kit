import test from "node:test";
import assert from "node:assert/strict";
import { validarPlugin } from "../../scripts/validar-plugin.mjs";

test("klap-dev-kit es estructuralmente coherente (gate real de CI)", () => {
  const { valido, problemas } = validarPlugin();
  assert.ok(valido, `Problemas encontrados:\n${JSON.stringify(problemas, null, 2)}`);
});
