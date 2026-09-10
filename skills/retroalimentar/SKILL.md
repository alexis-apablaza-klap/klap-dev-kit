---
name: retroalimentar
description: "Analiza cómo se ejecutó el workflow /klap:* (traza determinista + artefactos de fase) y consolida hallazgos priorizados en docs/mejoras-sugeridas.md. Uso: /klap:retroalimentar [ISSUE-KEY]"
---

# /klap:retroalimentar [ISSUE-KEY]

Invoca al agente `retroalimentador` (ver `agents/retroalimentador.md`). No implementa análisis
por sí misma — sólo decide sobre qué corre.

**Con `ISSUE-KEY`:** analiza esa HU. Insumos: `.klap/hu/<ISSUE-KEY>/traza.jsonl` y los artefactos
de fase del mismo directorio.

**Sin argumento:** analiza el acumulado — todas las HUs con traza bajo `.klap/hu/` — y consolida.
Es el modo que hace visible el patrón que una sola HU no muestra: un síntoma que reaparece en dos
HUs distintas es fricción del flujo, no de la HU.

Existe para no tener que cerrar una HU nueva sólo para revisar el flujo: la fase 9 de
`/klap:trabajar-hu` corre este mismo agente al cierre de cada HU.

## Reglas

- **No bloqueante, sin pausa humana.** El único efecto es reescribir `docs/mejoras-sugeridas.md`,
  que es un archivo de propuestas revisable por PR como cualquier otro.
- **Si no hay traza, dilo.** `.klap/hu/` está gitignoreado y es local: en un checkout limpio, o
  en la máquina de otro dev, no hay nada que leer. Ese caso se reporta como tal y el análisis se
  limita a los artefactos presentes — no se infiere fricción que no se puede ver.
- **El agente propone; nadie aplica desde acá.** Ninguna entrada de `mejoras-sugeridas.md` se
  ejecuta como efecto de esta skill. Aplicar una mejora es un cambio al kit y va por su propia
  rama y su propio PR.
- El archivo **se consolida, no crece**: techo de 12 entradas activas, mejoras ya aplicadas
  retiradas, síntomas repetidos fusionados subiendo prioridad (ver `agents/retroalimentador.md`).
