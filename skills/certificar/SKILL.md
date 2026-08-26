---
name: certificar
description: "Ejecuta tests, coverage, SonarQube y escaneo de dependencias/seguridad contra los quality gates de Klap, y emite un veredicto de certificación. Uso: /klap:certificar [ruta-repo] [ISSUE-KEY]"
---

# /klap:certificar

Invoca a `certificador` y `seguridad` (ver `agents/certificador.md` y `agents/seguridad.md`)
sobre el estado actual del repositorio (o el diff de la rama actual). Ambos entregan su parte
del veredicto; combínalos en un único `certificacion.json`.

Los umbrales viven en `config/quality-gates.yaml` y la decisión numérica la toma
`scripts/quality-gate.mjs` — el rol de los agentes es reunir evidencia real e interpretar lo
que un script no puede (calidad de las pruebas, criterio de seguridad sobre el diff), no
decidir el umbral por su cuenta.

Si se pasa un `ISSUE-KEY`, guarda el resultado en `.klap/hu/<ISSUE-KEY>/certificacion.json` —
es lo que el hook de `git push` (`hooks/pre-push-quality-gate.mjs`) verifica antes de permitir
el push en ramas con ese issue en el nombre. Sin `ISSUE-KEY`, reporta el veredicto sin
persistirlo en esa ruta.

Reporta el veredicto tal cual lo emiten los scripts — nunca lo suavices ni lo reinterpretes
como aprobado si `aprobado: false`.
