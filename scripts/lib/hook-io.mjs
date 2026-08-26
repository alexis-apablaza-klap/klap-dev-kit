/** Utilidades comunes para scripts invocados como hooks (stdin JSON → stdout JSON + exit code). */

export async function leerEventoHook() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Emite una denegación PreToolUse y termina el proceso con exit code 2 (bloqueante). */
export function denegar(hookEventName, razon) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        permissionDecision: "deny",
        permissionDecisionReason: razon,
      },
    })
  );
  process.exit(2);
}

/** Sin decisión: deja pasar el flujo normal. */
export function permitir() {
  process.exit(0);
}
