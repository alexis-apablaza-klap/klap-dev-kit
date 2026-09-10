---
name: memoria-actualizar
description: "Actualiza incrementalmente la memoria de un producto en Klap Knowledge a partir de un issue Jira o del producto directamente, sin releer todo. Uso: /klap:memoria-actualizar <producto|ISSUE-KEY>"
---

# /klap:memoria-actualizar <producto o ISSUE-KEY>

Invoca al agente `documentador-klap` (ver `agents/documentador-klap.md`) en su **Flujo B —
actualización incremental**.

Si el argumento es un issue Jira (p.ej. `SVA-1925`):

1. identifica a qué producto pertenece: si el issue tiene épica/`parent`, resuélvela primero
   con `producto_por_epica` (determinista); usa `buscar_producto` sobre título/descripción sólo
   como respaldo si no hay épica o la tool no resuelve nada;
2. deja que el agente lea sólo ese issue y decida, con `estado_fuentes`, qué más hace falta;
3. genera y aplica el patch resultante — si la épica no estaba registrada en `sources.yaml`,
   agrega `upsert_source_state` para que la próxima resolución sea determinista.

Si el argumento es un producto (p.ej. `abono-ya`):

1. el agente consulta `estado_fuentes` para identificar qué cambió en Jira/Confluence desde la
   última sincronización. Si `confluence.pages` viene vacío, no hay cursor contra el que
   comparar: la primera pasada tendrá que leer el espacio, y debe dejarlo poblado para que la
   siguiente sí sea incremental;
2. actualiza sólo esas fuentes — nunca reescanea todo el histórico por defecto. Cada página
   releída se registra con `upsert_document` **y** avanza su entrada en `confluence.pages`; las
   dos van juntas o el delta-sync no converge (ver `agents/documentador-klap.md`, Flujo A paso
   5);
3. corre `node scripts/descubrir-componentes.mjs --producto <producto>` (barato: sólo
   filesystem local) y entrega su salida al agente junto con `obtener_producto().technical.
   components` ya leído en el paso 1. El agente propone **sólo el delta**: un repo nuevo sin
   `component_id` registrado → alta (`upsert_component` + `upsert_component_link`); un repo que
   ya no aparece localmente → nunca lo retires en silencio, propón `upsert_component` con
   `status: deprecated` y `remove_component_link` para revisión (puede ser que el repo se haya
   movido o renombrado, no necesariamente que el componente murió). Sin cambios detectados, no
   generes operaciones de componente en este patch;
4. genera y aplica el patch resultante.

Por defecto, esta skill **no pausa** para cambios de bajo riesgo (ver criterios en
`agents/documentador-klap.md`) — sólo se detiene si el propio agente detecta ambigüedad,
conflicto o un cambio canónico de alto impacto. No la uses para inicializar un producto que no
existe todavía — para eso está `/klap:memoria-inicializar`.

Tras cada `aplicar_patch_memoria` con `applied: true`, corre
`node scripts/memoria-git.mjs --producto <product_id> [--issue <ISSUE-KEY>]` para dejar el
cambio en la rama `producto/<product_id>` con PR hacia `main` (merge humano).
