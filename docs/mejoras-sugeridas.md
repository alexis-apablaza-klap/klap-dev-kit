# Mejoras sugeridas al workflow Klap

Mantenido por el agente `retroalimentador` (ver `agents/retroalimentador.md`), que lo **reescribe
completo** en cada corrida de `/klap:retroalimentar` o de la fase 9 de `/klap:trabajar-hu`.

**Este archivo se consolida, no se acumula.** Techo declarado: **12 entradas activas**. Una mejora
ya aplicada se retira; dos hallazgos del mismo síntoma se fusionan subiendo su prioridad; nada de
historial (lo que ya se hizo vive en el `CHANGELOG.md`).

Cada entrada exige **evidencia citable** — fase y línea de `traza.jsonl`, o artefacto y sección.
Un hallazgo sin evidencia no entra. El agente propone; aplicar una mejora es un cambio al kit y va
por su propia rama y su propio PR.

---

## Entradas activas

_Ninguna todavía._ La primera corrida real es la fase 7 del plan vigente (HU de `cuota-comercio`),
que es la primera HU end-to-end con traza completa. Hasta entonces este archivo está vacío **por
diseño**: precargarlo con mejoras deducidas de leer el kit sería exactamente la fricción inventada
que `agents/retroalimentador.md` prohíbe.

---

## Formato de cada entrada

```markdown
### <título corto del síntoma>

- **Síntoma observado:** qué pasó, en términos verificables.
- **Evidencia:** `traza.jsonl:<n>` (fase N) — o artefacto + sección.
- **Causa probable:** declarada como probable, no como hecho.
- **Mejora propuesta:** qué archivo del kit y qué cambio.
- **Prioridad:** alta | media | baja
- **Esfuerzo:** bajo | medio | alto
```

## Entradas desplazadas por el techo

_Ninguna._ Cuando un hallazgo nuevo supere las 12 entradas activas, el desplazado se nombra acá
con su prioridad — no se borra en silencio.
