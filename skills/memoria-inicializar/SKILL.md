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
   (nombre oficial si hay dudas, público esperado, objetivo, relación con otros productos) se
   pre-llenan desde las fuentes y se presentan para confirmar, no como cuestionario abierto;
3. **descubrir componentes candidatos.** Corre
   `node scripts/descubrir-componentes.mjs --producto <producto>` (determinista, sin LLM, sin
   red — `documentador-klap` no puede ejecutarlo, tiene `disallowedTools: Bash`) y entrega su
   salida (`.klap/knowledge/<producto>/componentes.json`) al agente junto con el resto del
   contexto recopilado. El agente la cruza con Confluence/Jira/Klap Knowledge y produce
   `componentes.md`: una tabla **provisional y editable** (incluir/tipo/`component_id`/
   repositorio/criticidad/rol/evidencia/confianza) — revísala, quita filas, corrige
   clasificación `principal`/`secundario`, y agrega componentes que no tengan checkout local
   (p.ej. mencionados sólo en Confluence) antes de continuar. El agente relee la tabla editada;
   si la dejas vacía a propósito, el alta continúa sin componentes;
4. presentar la propuesta (`.klap/knowledge/<producto>/proposal.md` y `patch.json`) — el patch
   debe incluir `upsert_source_state` con las épicas/espacios recogidos, sin excepción, las
   operaciones de componente que resulten de la tabla validada en el paso 3 (si quedó alguna
   fila incluida), y **un `upsert_document` por cada página de Confluence que el agente leyó**,
   más esa misma página como cursor en `confluence.pages` del `upsert_source_state`. Un alta que
   leyó Confluence y no deja documentos registrados nace ciega: el resumen queda en el artefacto
   local (gitignored) y la próxima pasada relee el espacio completo;
5. **pausa humana obligatoria** antes de aplicar — sin excepción para creación inicial;
6. tras aprobar, aplicar el patch y reportar `product_id`/`new_revision`/`changed_files`;
7. correr `node scripts/memoria-git.mjs --producto <product_id>` para dejar el alta en una
   rama `producto/<product_id>` con PR hacia `main` (merge humano, no automático).

Si el usuario pide inicializar un producto que ya existe, no lo trates como error silencioso:
explica que ya existe y ofrece `/klap:memoria-actualizar` en su lugar.
