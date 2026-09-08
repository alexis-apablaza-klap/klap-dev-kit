---
name: memoria-inicializar
description: "Construye la memoria inicial de un producto Klap en Klap Knowledge desde Jira, Confluence y repos, preguntando sólo lo no resoluble, con pausa humana antes de aplicar. Uso: /klap:memoria-inicializar <producto>"
---

# /klap:memoria-inicializar <producto>

Invoca al agente `documentador-klap` (ver `agents/documentador-klap.md`) en su **Flujo A —
memoria inicial**. Antes de arrancar, resuelve `config/klap.yaml` (`mcp.knowledge`) — si el
MCP no está disponible, decláralo y detente: no tiene sentido inicializar memoria sin poder
leer primero el estado actual.

Se invoca a mano o automáticamente cuando `/klap:trabajar-hu` (fase 1) detecta, vía el Flujo 0
de `documentador-klap`, que la HU pertenece a un producto que no existe aún en la memoria.

No implementa lógica de negocio por sí mismo — sólo orquesta al agente:

1. comprobar en Klap Knowledge que el producto no exista ya (si existe, deriva a
   `/klap:memoria-actualizar` en vez de reinicializar);
2. **preguntar siempre** épica(s) Jira y espacio(s) Confluence del producto — anclan toda
   sincronización futura, no son inferibles con confianza. El resto de las preguntas mínimas
   (nombre oficial si hay dudas, público esperado, objetivo, relación con otros productos,
   componentes sin `component_id` claro) se pre-llenan desde las fuentes y se presentan para
   confirmar, no como cuestionario abierto;
3. presentar la propuesta (`.klap/knowledge/<producto>/proposal.md` y `patch.json`) — el patch
   debe incluir `upsert_source_state` con las épicas/espacios recogidos, sin excepción;
4. **pausa humana obligatoria** antes de aplicar — sin excepción para creación inicial;
5. tras aprobar, aplicar el patch y reportar `product_id`/`new_revision`/`changed_files`;
6. correr `node scripts/memoria-git.mjs --producto <product_id>` para dejar el alta en una
   rama `producto/<product_id>` con PR hacia `main` (merge humano, no automático).

Si el usuario pide inicializar un producto que ya existe, no lo trates como error silencioso:
explica que ya existe y ofrece `/klap:memoria-actualizar` en su lugar.
