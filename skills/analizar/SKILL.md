---
name: analizar
description: "Ejecuta sólo las fases de Contexto y Análisis sobre una HU o un problema puntual, sin avanzar a diseño ni implementación. Uso: /klap:analizar <ISSUE-KEY o descripción>"
---

# /klap:analizar

Invoca al agente `analista` (ver `agents/analista.md`) para producir contexto + análisis
siguiendo el mismo orden estricto de fuentes que usa `/klap:trabajar-hu` (Jira → Klap
Knowledge → memoria del repo → `documentos_relevantes`/`buscar` → Confluence sólo si falta
información).

Usa este skill cuando quieras el análisis por sí solo — para estimar, para discutir alcance,
o como insumo previo a decidir si vale la pena abrir una HU. Si el usuario luego pide avanzar
a diseño e implementación, sugiere `/klap:trabajar-hu <ISSUE-KEY>` para el flujo completo con
gates de certificación, en vez de continuar ad hoc.

Salida: el mismo formato de `analisis.md` (hechos / supuestos / decisiones / preguntas
pendientes). Si no hay un `<ISSUE-KEY>` de Jira, trabaja sobre la descripción libre que dé el
usuario y dilo explícitamente en la salida.
