---
titulo: "Angular / TypeScript — convenciones heredadas (requiere revisión)"
obligatoriedad: RECOMMENDED
estado: requiere-revision
origen: "eco-team-brain/commands/angular/developer.md, eco-team-brain/commands/angular/new-app.md"
revisado_por: null
revisado_en: null
tags: [angular, typescript, frontend]
---

> **Contenido heredado de eco-team-brain, no confirmado por el equipo Klap.** Condensado desde
> los skills `angular-developer` y `angular-new-app` (Angular Team @ Google / Google LLC), que
> son guías genéricas de buenas prácticas Angular — no específicas de un proyecto Klap. Antes
> de tratarlas como estándar Klap, confirmar que la versión de Angular real de los frontends
> Klap (`config/klap.yaml` → `stack_soportado.frontend.angular`) soporta lo que aquí se
> describe, y ajustar según los proyectos existentes.

# Angular / TypeScript — resumen condensado

## Antes de generar código

Verificar siempre la versión real de Angular del proyecto — las prácticas correctas (Signals
vs RxJS clásico, Signal Forms vs Reactive Forms) varían significativamente entre versiones. No
asumir la última versión disponible si el proyecto es antiguo.

## Reactividad

- Preferir **Signals** (`signal`, `computed`, `effect`) para estado y reactividad en proyectos
  nuevos o que ya migraron.
- `linkedSignal` para estado escribible derivado de una fuente; `resource` para datos
  asíncronos directamente en estado de signal.
- `inject()` en vez de inyección por constructor donde el estilo del proyecto ya lo adoptó — no
  mezclar ambos estilos en el mismo componente sin razón.

## Componentes y control flow

Control flow moderno en templates (`@if`, `@for`, `@switch`) sobre las directivas estructurales
clásicas (`*ngIf`, `*ngFor`) en código nuevo. Componentes standalone sobre NgModules en
proyectos nuevos.

## Formularios

Signal Forms para formularios nuevos si la versión del proyecto los soporta; Reactive Forms
para formularios complejos en proyectos que aún no migraron; Template-driven sólo para casos
simples.

## Tooling

Angular CLI como forma estándar de generar componentes/servicios/pipes/guards — preferible a
crear los archivos a mano, para mantener consistencia de estructura. Tras generar código,
correr `ng build` (o el equivalente del proyecto) para confirmar que compila antes de darlo por
terminado.

## Testing

Vitest/`TestBed` para unit; harnesses de componente para interacción robusta; E2E con Cypress
donde el proyecto ya lo use.

## Lo que quedó fuera de este resumen

El contenido original de `mastering-typescript/references/` (generics avanzados, patrones
enterprise, integración NestJS/React) no se condensó aquí por no ser específico de los
frontends Klap actuales — revisar si aporta valor antes de incorporarlo.
