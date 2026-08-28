# Detalle de fases — /klap:trabajar-hu

Referencia bajo demanda del orquestador. No es necesario leerla completa: ve directo a la
fase que estás ejecutando.

## Fase 1 — Contexto

Invoca `analista` con el `<ISSUE-KEY>`. El agente sigue el orden estricto documentado en
`agents/analista.md` (Jira → producto → Klap Knowledge → component.yaml/índice →
`documentos_relevantes`/`buscar` → Confluence sólo si falta algo). Guarda su salida en
`.klap/hu/<ISSUE-KEY>/contexto.md`. Corre
`node scripts/validar-artefacto-fase.mjs contexto .klap/hu/<ISSUE-KEY>/contexto.md`; si faltan
secciones, reinvoca a `analista` con la lista antes de avanzar a fase 2. Sin pausa humana.

## Fase 2 — Análisis

Invoca `analista` de nuevo, pasándole `contexto.md` (no repitas la recolección de fuentes).
Guarda `analisis.md` con hechos/supuestos/decisiones/preguntas pendientes. Antes de la pausa,
corre `node scripts/validar-artefacto-fase.mjs analisis .klap/hu/<ISSUE-KEY>/analisis.md`. Si
reporta secciones faltantes, reinvoca a `analista` con esa lista en vez de presentar al humano
un artefacto incompleto. **Pausa:** presenta el análisis al humano. Si hay preguntas pendientes
bloqueantes, resuélvelas con el humano antes de continuar — no asumas respuestas.

## Fase 3 — Diseño

Invoca `arquitecto` con `analisis.md`. Guarda `diseno.md`. Antes de la pausa, corre
`node scripts/validar-artefacto-fase.mjs diseno .klap/hu/<ISSUE-KEY>/diseno.md`; si faltan
secciones, reinvoca a `arquitecto` con la lista antes de presentar el diseño. **Pausa:**
presenta el diseño y espera confirmación explícita antes de tocar código.

## Fase 4 — Implementación

Invoca `desarrollador` con `diseno.md` confirmado. No hay artefacto de texto — el resultado es
el diff + las pruebas en el repo de trabajo.

## Fase 5 — Validación

Ejecuta, no invoques un agente para esto — es determinista:
- `node scripts/ejecutar-tests.mjs <repo>`
- `node scripts/validar-component.mjs <repo>` si la HU tocó `component.yaml` o el índice
Guarda el resultado combinado en `validacion.json`. Si algo falla aquí, vuelve a fase 4 antes
de avanzar — no llegues a certificación con tests rotos.

## Fase 6 — Certificación

Invoca `certificador` y `seguridad` (pueden correr en paralelo, cada uno entrega su parte).
El `certificador` corre `scripts/quality-gate.mjs` sobre las métricas reales que reunió;
`seguridad` corre `scripts/deps-scan.mjs` e interpreta el diff, y si el componente tiene
`*KafkaConfig.java` corre además `scripts/auditar-kafka.mjs`. Combina ambos en
`certificacion.json` con un único `aprobado` (AND de ambos) y la lista completa de `motivos`.
Si `aprobado: false`, detente aquí y repórtalo — no continúes a documentación.

## Fase 7 — Documentación

Invoca `documentador` con el diff final y `diseno.md`/`analisis.md` como contexto de qué
cambió. **Pausa antes de escribir a Confluence** (el cambio en el repo vía Git no necesita
pausa adicional, ya es revisable por PR). Si hubo cambio en Confluence, confirma el
`targeted_sync` solicitado.

## Fase 8 — Finalización

Invoca la capacidad de `/klap:actualizar-componente` sobre el repo si el `documentador` no
la cubrió ya. Cierra con un resumen corto: qué se hizo, artefactos generados, estado de
certificación, y qué queda pendiente (si algo del análisis quedó como pregunta abierta que no
bloqueaba la HU pero vale la pena registrar).
