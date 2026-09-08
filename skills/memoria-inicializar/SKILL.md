---
name: memoria-inicializar
description: "Construye la memoria inicial de un producto Klap en Klap Knowledge desde Jira, Confluence y repos, preguntando sólo lo no resoluble, con pausa humana antes de aplicar. Uso: /klap:memoria-inicializar <producto>"
---

# /klap:memoria-inicializar <producto>

Invoca al agente `documentador-klap` (ver `agents/documentador-klap.md`) en su **Flujo A —
memoria inicial**. Antes de arrancar, resuelve `config/klap.yaml` (`mcp.knowledge`) — si el
MCP no está disponible, decláralo y detente: no tiene sentido inicializar memoria sin poder
leer primero el estado actual.

No implementa lógica de negocio por sí mismo — sólo orquesta al agente:

1. comprobar en Klap Knowledge que el producto no exista ya (si existe, deriva a
   `/klap:memoria-actualizar` en vez de reinicializar);
2. dejar que el agente recopile fuentes y formule las preguntas mínimas necesarias;
3. presentar la propuesta (`.klap/knowledge/<producto>/proposal.md` y `patch.json`);
4. **pausa humana obligatoria** antes de aplicar — sin excepción para creación inicial;
5. tras aprobar, aplicar el patch y reportar `product_id`/`new_revision`/`changed_files`.

Si el usuario pide inicializar un producto que ya existe, no lo trates como error silencioso:
explica que ya existe y ofrece `/klap:memoria-actualizar` en su lugar.
