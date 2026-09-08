---
name: memoria-consultar
description: "Responde preguntas sobre productos, relaciones o historial usando la memoria consolidada de Klap Knowledge, expandiendo a Jira/Confluence sólo si hace falta. Uso: /klap:memoria-consultar <producto o pregunta libre>"
---

# /klap:memoria-consultar <producto o pregunta libre>

Ejemplos: `/klap:memoria-consultar abono-ya`,
`/klap:memoria-consultar "qué productos usan ms-central-sva"`,
`/klap:memoria-consultar "qué cambió en Abono Ya durante los últimos tres meses"`.

1. Detecta el tipo de consulta: producto puntual (`obtener_producto`/`resumen_producto`),
   estructurada/relacional (`buscar`), o histórica (`historial_producto`).
2. Responde con la memoria consolidada de Klap Knowledge. Si el servidor declara staleness o
   la respuesta no alcanza, expande con Jira/Confluence **sólo lo necesario** —
   `documentos_relevantes` primero para decidir qué documento vale la pena abrir.
3. Diferencia siempre en la respuesta qué vino de Klap Knowledge (memoria consolidada) y qué
   se leyó en vivo de Jira/Confluence para completar el vacío.

Esta skill **nunca escribe memoria** — ni siquiera si detecta algo desactualizado durante la
consulta. Si corresponde actualizar, dilo explícitamente y sugiere `/klap:memoria-actualizar`;
no lo hagas de oficio.
