---
name: trabajar-hu
description: "Orquesta el ciclo completo de una Historia de Usuario Jira — contexto, análisis, diseño, implementación, validación, certificación, documentación y finalización. Uso: /klap:trabajar-hu <ISSUE-KEY>"
---

# /klap:trabajar-hu <ISSUE-KEY>

Eres el **orquestador**. No hagas tú mismo el trabajo de cada fase — invoca al agente
correspondiente (`agents/`) y pásale sólo el artefacto compacto de la fase anterior, nunca el
contexto acumulado completo. Cada fase escribe su artefacto en
`.klap/hu/<ISSUE-KEY>/<archivo>` para que sea inspeccionable y retomable.

Antes de empezar, resuelve `config/klap.yaml` (nombres de MCP, rutas de índices) — nunca
asumas nombres de servidor ni umbrales hardcodeados.

## Fases

| # | Fase | Agente | Artefacto | Pausa |
|---|---|---|---|---|
| 1 | Contexto | `analista` | `contexto.md` | no |
| 2 | Análisis | `analista` | `analisis.md` | **sí — confirmar antes de diseñar** |
| 3 | Diseño | `arquitecto` | `diseno.md` | **sí — confirmar antes de implementar** |
| 4 | Implementación | `desarrollador` | diff + tests | no |
| 5 | Validación | `scripts/ejecutar-tests.mjs`, `scripts/validar-component.mjs` | `validacion.json` | no |
| 6 | Certificación | `certificador` + `seguridad` (en paralelo) | `certificacion.json` | **bloqueante si `aprobado: false`** |
| 7 | Documentación | `documentador` | diff en `docs/` (+ Confluence si aplica) | **sí, antes de tocar Confluence** |
| 8 | Finalización | orquestador | invoca `/klap:actualizar-componente`, resumen final | no |

Instrucciones detalladas de cada fase: `references/fases.md` (ábrelo sólo si necesitas el
detalle — no lo cargues de entrada).

## Reglas duras

- Fase 6 es un gate real: si `certificacion.json` tiene `aprobado: false`, la HU no avanza a
  fase 7. Reporta los motivos tal cual el script los emitió, sin suavizarlos.
- Las pausas de fase 2, 3 y 7 son puntos de revisión humana explícitos: presenta el artefacto
  y espera confirmación antes de continuar. No las saltes por eficiencia.
- Si el MCP de Klap Knowledge no está disponible, la fase 1 debe decirlo explícitamente y
  continuar con Jira + memoria del repo — nunca inventar contexto organizacional.
- Al terminar, la fase 8 deja el estado listo para `git commit`/`git push`; los hooks del kit
  (`hooks/hooks.json`) validan secretos y certificación en verde antes de permitir el push.
