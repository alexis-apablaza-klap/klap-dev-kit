---
titulo: "Angular / TypeScript — piso de versión y cómo consultar patrones vigentes"
obligatoriedad: RECOMMENDED
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [angular, typescript, frontend, context7]
---

# Angular / TypeScript

Klap fija únicamente el **piso de versión** soportado. Todo lo demás — qué API de reactividad
usar, sintaxis de control flow vigente, madurez de una feature, forma correcta de testear — es
propiedad del framework, no una decisión de negocio Klap, y cambia con cada versión mayor de
Angular (~cada 6 meses). Por eso este documento no condensa esas prácticas como un standard
estático: quedaría desalineado más rápido que el ciclo de revisión de este kit.

## Piso de versión

`config/klap.yaml` → `stack_soportado.frontend.angular` — hoy `21.x`. Un proyecto puede estar
en una versión mayor a ese piso, nunca menor.

## Cómo consultar qué es idiomático hoy

No asumir patrones de Angular por conocimiento genérico ni por una guía condensada desactualizable
— usar **Context7** (`config/klap.yaml` → `mcp.context7.server`) o la documentación oficial para
verificar el comportamiento/API real de la versión instalada en el proyecto **antes** de
recomendar un patrón (Signals vs RxJS, control flow, Signal Forms vs Reactive Forms, testing,
etc.).

Antes de generar código, verificar siempre la versión real del proyecto (`package.json`/
`angular.json`) — no asumir la última disponible si el proyecto está en una versión anterior.
