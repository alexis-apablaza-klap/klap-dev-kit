---
name: consultar-estandar
description: "Busca y muestra sólo el/los estándar(es) Klap relevantes a un tema, sin cargar el árbol completo de standards/. Uso: /klap:consultar-estandar <tema>"
---

# /klap:consultar-estandar <tema>

1. Lee **sólo** `standards/index.yaml` (es pequeño, se lee completo).
2. Filtra por coincidencia en `resumen`/`tags` con `<tema>`. Si hay varias coincidencias,
   lista todas con su `obligatoriedad` y `estado` antes de abrir ninguna; si el tema es
   inequívoco, abre directamente el documento.
3. Abre únicamente el/los documento(s) seleccionados (`path`) — nunca el resto del árbol.
4. Si el documento tiene `estado: requiere-revision`, adviértelo explícitamente antes de
   presentarlo: es contenido heredado pendiente de validación por el equipo, no un estándar
   confirmado.
5. Si no hay coincidencias, dilo — no inventes una recomendación a partir de conocimiento
   genérico presentándola como estándar Klap.

Este skill es la forma explícita de progressive disclosure sobre `standards/` para consulta
humana ad hoc. Los demás agentes (`arquitecto`, `desarrollador`, etc.) aplican el mismo patrón
internamente sin necesidad de invocar este skill.
