---
name: actualizar-componente
description: "Revisa el estado real de un repositorio y propone/actualiza docs/context/index.yaml y los documentos de docs/ que correspondan. Uso: /klap:actualizar-componente [ruta-repo]"
---

# /klap:actualizar-componente

NOTA: este skill está pendiente de reconversión para escribir directamente en Klap Knowledge
en vez de un archivo del repo (ver plan de componentes). Por ahora sólo mantiene
`docs/context/index.yaml`.

1. Compara `docs/context/index.yaml` contra el estado real del repo (dependencias declaradas
   en build/manifest, endpoints en el código, topics de Kafka configurados, documentos en
   `docs/`) y **propone** el diff — no lo sobrescribas directamente sin mostrarlo.
2. Agrega entradas para documentos nuevos, marca `obsoleto: true` las que apunten a algo que
   ya no existe (no las borres).
3. Valida el resultado con `node scripts/validar-contexto.mjs <repo>` antes de terminar.

Este skill se ejecuta también internamente al final de `/klap:trabajar-hu` (fase 8) cuando la
HU produjo cambios relevantes al componente. En ese caso, usa el diff y el `diseno.md` de la
HU como fuente de qué cambió, en vez de re-inferir todo desde cero.

Nunca sobrescribas documentación existente en silencio — genera un diff revisable por PR.
