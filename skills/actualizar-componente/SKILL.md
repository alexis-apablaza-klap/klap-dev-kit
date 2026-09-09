---
name: actualizar-componente
description: "Revisa el estado real de un repositorio, propone un upsert_component hacia Klap Knowledge y actualiza docs/context/index.yaml. Uso: /klap:actualizar-componente [ruta-repo]"
---

# /klap:actualizar-componente

Klap Knowledge es la única fuente de verdad de los componentes (contrato v2.3.0) — este skill
ya no crea ni mantiene ningún archivo de componente en el repo. Tiene dos responsabilidades
separadas: reconciliar la representación del componente en Klap Knowledge, y mantener
`docs/context/index.yaml` (memoria técnica del repo — un concepto distinto que no cambia).

## 1. Reconciliar el componente en Klap Knowledge

1. Resuelve el `component_id`: si el repo ya está vinculado a algún producto
   (`obtener_producto().technical.components` o `resumen_componente`), usa ese id — nunca
   inventes uno nuevo para un componente que ya existe. Si no existe todavía, normalízalo desde
   el nombre del repo (`^[a-z0-9][a-z0-9-]*$`; ver `agents/documentador-klap.md`, Flujo A paso
   6.5, para la regla exacta — p.ej. `mc_tlog` → `mc-tlog`, preservando el nombre real en
   `repository`).
2. Infiere del código real: dependencias declaradas en build/manifest, endpoints expuestos,
   topics de Kafka configurados, y un resumen breve de responsabilidad — nunca inventes lo que
   el código no respalda.
3. **Propone** el diff (no lo aplica) y lo entrega a `documentador-klap`
   (`agents/documentador-klap.md`) para que arme y aplique la operación `upsert_component` —
   este skill no llama `aplicar_patch_memoria` directamente, `documentador-klap` es quien
   concentra esa escritura y su pausa/gate de riesgo. Si el componente no existe todavía en
   Knowledge y no hay un producto claro al que vincularlo, deja la propuesta pendiente y remite
   a `/klap:memoria-actualizar <producto>` en vez de crear un componente sin dueño.

## 2. `docs/context/index.yaml`

1. Compara contra el estado real del repo (dependencias declaradas en build/manifest, endpoints
   en el código, topics de Kafka configurados, documentos en `docs/`) y **propone** el diff — no
   lo sobrescribas directamente sin mostrarlo.
2. Agrega entradas para documentos nuevos, marca `obsoleto: true` las que apunten a algo que ya
   no existe (no las borres).
3. Valida el resultado con `node scripts/validar-contexto.mjs <repo>` antes de terminar.

Este skill se ejecuta también internamente al final de `/klap:trabajar-hu` (fase 8) cuando la
HU produjo cambios relevantes al componente. En ese caso, usa el diff y el `diseno.md` de la HU
como fuente de qué cambió, en vez de re-inferir todo desde cero — la propuesta de
`upsert_component` que arma este skill es el insumo que `documentador-klap` recibe en esa fase.

Nunca sobrescribas documentación ni memoria existente en silencio — toda propuesta (componente
o `docs/context/index.yaml`) es un diff revisable, nunca una escritura directa.
