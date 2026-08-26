---
name: desarrollar
description: "Implementa un diseño ya aprobado (diseno.md) aplicando las convenciones y estándares Klap del stack del componente. Uso: /klap:desarrollar [ruta-a-diseno.md]"
---

# /klap:desarrollar

Invoca al agente `desarrollador` (ver `agents/desarrollador.md`) con un diseño ya aprobado:
`diseno.md` de `/klap:disenar` o `/klap:trabajar-hu`, o una instrucción directa si no hay
diseño formal previo (para cambios pequeños y acotados — dilo explícitamente en la salida).

Antes de escribir código, lee las convenciones existentes del repo (naming, estructura,
manejo de errores, logging) — son la fuente de verdad por encima de cualquier plantilla
genérica de `standards/`. Aplica TDD cuando sea razonable para el tipo de cambio.

No es este skill el que certifica el resultado — usa `/klap:certificar` después, o el flujo
completo `/klap:trabajar-hu` si el cambio corresponde a una HU con gate de certificación.
