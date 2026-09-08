---
name: memoria-actualizar
description: "Actualiza incrementalmente la memoria de un producto en Klap Knowledge a partir de un issue Jira o del producto directamente, sin releer todo. Uso: /klap:memoria-actualizar <producto|ISSUE-KEY>"
---

# /klap:memoria-actualizar <producto o ISSUE-KEY>

Invoca al agente `documentador-klap` (ver `agents/documentador-klap.md`) en su **Flujo B —
actualización incremental**.

Si el argumento es un issue Jira (p.ej. `SVA-1925`):

1. identifica a qué producto pertenece (`buscar_producto` sobre título/descripción del issue);
2. deja que el agente lea sólo ese issue y decida, con `estado_fuentes`, qué más hace falta;
3. genera y aplica el patch resultante.

Si el argumento es un producto (p.ej. `abono-ya`):

1. el agente consulta `estado_fuentes` para identificar qué cambió en Jira/Confluence desde la
   última sincronización;
2. actualiza sólo esas fuentes — nunca reescanea todo el histórico por defecto;
3. genera y aplica el patch resultante.

Por defecto, esta skill **no pausa** para cambios de bajo riesgo (ver criterios en
`agents/documentador-klap.md`) — sólo se detiene si el propio agente detecta ambigüedad,
conflicto o un cambio canónico de alto impacto. No la uses para inicializar un producto que no
existe todavía — para eso está `/klap:memoria-inicializar`.
