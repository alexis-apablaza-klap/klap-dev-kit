# Detalle de fases — /klap:trabajar-hu

Referencia bajo demanda del orquestador. No es necesario leerla completa: ve directo a la
fase que estás ejecutando.

## Fase 1 — Contexto

**Paso 0 — gate de producto (bloqueante).** Antes de invocar al `analista`, trae de Jira (MCP
Atlassian) el `<ISSUE-KEY>` con su épica/`parent`, e invoca `documentador-klap` en su
**Flujo 0** (`agents/documentador-klap.md`) con el ISSUE-KEY y esa épica. Tres desenlaces:
- **Producto resuelto** (por `producto_por_epica` o, si la épica no está sincronizada aún, por
  `buscar_producto` confirmando un producto existente) → continúa al paso siguiente con ese
  producto ya identificado.
- **Producto existe pero su épica no estaba registrada** → `documentador-klap` deja pendiente
  un `upsert_source_state` (Flujo B) y continúa igual — no bloquea la HU por esto.
- **Requiere alta** (ninguna señal resuelve un producto existente) → **detente aquí**. Dispara
  `/klap:memoria-inicializar` para ese producto; su pausa humana obligatoria decide si se
  aprueba la creación. Sólo al aplicarse el patch de alta continúa esta fase — no adivines ni
  avances "sin memoria de producto" en silencio.

Con el producto resuelto, invoca `analista` con el `<ISSUE-KEY>` (y el producto ya
identificado, para que no repita el gate). El agente sigue el orden estricto documentado en
`agents/analista.md` (Jira → producto → Klap Knowledge → índice de contexto →
`documentos_relevantes`/`buscar` → Confluence sólo si falta algo). Guarda su salida en
`.klap/hu/<ISSUE-KEY>/contexto.md`. Corre
`node scripts/validar-artefacto-fase.mjs contexto .klap/hu/<ISSUE-KEY>/contexto.md`; si faltan
secciones, reinvoca a `analista` con la lista antes de avanzar a fase 2. Sin pausa humana
adicional (la única pausa de esta fase es la del gate de producto, si aplicó).

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
- `node scripts/validar-contexto.mjs <repo>` si la HU tocó el índice de contexto
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
pausa adicional, ya es revisable por PR). No dispares ninguna escritura a Klap Knowledge desde
esta fase — el resultado (diff de `docs/` + cambio de Confluence si aplica) se entrega íntegro
a la fase 8.

## Fase 8 — Finalización

1. Invoca la capacidad de `/klap:actualizar-componente` sobre el repo si el `documentador` no
   la cubrió ya.
2. Invoca `documentador-klap` (ver `agents/documentador-klap.md`, Flujo B — actualización
   incremental) con un input compacto: `<ISSUE-KEY>`, el/los producto(s) ya identificados en
   fase 1, `analisis.md`, `diseno.md`, un resumen del diff final, los componentes afectados,
   los documentos de Confluence modificados (si hubo) y el resultado del `documentador`. Debe
   producir sólo el delta de memoria global que corresponde a esta HU — nunca reescanear todo
   el producto. Si `documentador-klap` señala un conflicto o ambigüedad de alto impacto, repórtalo
   igual que cualquier pregunta pendiente — no lo resuelvas por tu cuenta.
3. Si `aplicar_patch_memoria` se aplicó (`applied: true`), corre
   `node scripts/memoria-git.mjs --producto <product_id> --issue <ISSUE-KEY>`: deja el cambio
   en la rama `producto/<product_id>` del checkout de `klap-dev-kit-knowledge` con PR hacia
   `main`. El merge del PR es humano — repórtalo como pendiente de revisión, nunca como cerrado.
4. Cierra con un resumen corto: qué se hizo, artefactos generados, estado de certificación, el
   resultado de `documentador-klap` (aplicado o pendiente de confirmación, con
   `new_revision`/`changed_files` si aplicó), el PR de memoria si se creó, y qué queda pendiente
   (si algo del análisis quedó como pregunta abierta que no bloqueaba la HU pero vale la pena
   registrar).
