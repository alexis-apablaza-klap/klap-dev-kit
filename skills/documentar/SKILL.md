---
name: documentar
description: "Actualiza la memoria versionada del repo y, si corresponde, Confluence, a partir de un cambio ya implementado. Uso: /klap:documentar [ISSUE-KEY]"
---

# /klap:documentar

Invoca al agente `documentador` (ver `agents/documentador.md`) sobre el diff actual del repo
(o el de la HU `<ISSUE-KEY>` si se indica). Sigue el orden fijo: primero memoria versionada
del repo (Git, revisable por PR), después Confluence sólo si hay conocimiento a nivel
producto, y sólo entonces entrega el contexto compacto a `documentador-klap` (ver
`agents/documentador-klap.md`), que decide si corresponde un patch de memoria global.

Nunca sobrescribe documentación existente en silencio — todo cambio a un documento con
contenido humano se propone como diff explícito.

Si además quieres un Registro de Cambio (RDC) para publicar, pídelo explícitamente: usa la
plantilla `templates/rdc.md` y complétala con lo que efectivamente cambió (no un resumen
genérico del commit).
