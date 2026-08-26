---
name: actualizar-componente
description: "Revisa el estado real de un repositorio y propone/actualiza component.yaml, docs/context/index.yaml y los documentos de docs/ que correspondan. Uso: /klap:actualizar-componente [ruta-repo]"
---

# /klap:actualizar-componente

1. Si `component.yaml` no existe, créalo desde `templates/component.yaml` — complétalo con lo
   que puedas inferir del código (tecnologías, APIs expuestas/consumidas, datos, eventos) y
   marca con `TODO` lo que requiera confirmación humana (productos, `klap_knowledge.component_id`).
2. Si ya existe, compáralo contra el estado real del repo (dependencias declaradas en
   build/manifest, endpoints en el código, topics de Kafka configurados) y **propone** el
   diff — no lo sobrescribas directamente sin mostrarlo.
3. Igual para `docs/context/index.yaml`: agrega entradas para documentos nuevos, marca
   `obsoleto: true` las que apunten a algo que ya no existe (no las borres).
4. Valida el resultado con `node scripts/validar-component.mjs <repo>` antes de terminar.

Este skill se ejecuta también internamente al final de `/klap:trabajar-hu` (fase 8) cuando la
HU produjo cambios relevantes al componente. En ese caso, usa el diff y el `diseno.md` de la
HU como fuente de qué cambió, en vez de re-inferir todo desde cero.

Nunca sobrescribas documentación existente en silencio — genera un diff revisable por PR.
