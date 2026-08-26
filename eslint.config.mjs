// Chequeo mínimo de estilo/errores comunes para los 20+ scripts .mjs del kit — antes de esto
// nada en CI exigía consistencia, sólo la disciplina de quien escribía cada script.
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      // ignoreRestSiblings: patrón "const { x, ...resto } = obj" para excluir una clave —
      // x queda sin uso a propósito, no es una variable olvidada.
      "no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    ignores: ["node_modules/", "coverage/"],
  },
];
