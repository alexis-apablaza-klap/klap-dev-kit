# El flujo de `/klap:trabajar-hu`

Vista para developers de las 8 fases (el detalle técnico exacto que sigue Claude está en
`skills/trabajar-hu/references/fases.md`, pensado para el modelo, no para leer a mano).

```
1. Contexto        → (gate) resuelve el producto por su épica; trae la HU y todo lo relevante
2. Análisis        → (pausa) revisas hechos/supuestos/preguntas antes de que se diseñe nada
3. Diseño          → (pausa) revisas la propuesta antes de que se toque código
4. Implementación  → se escribe el código y las pruebas
5. Validación      → tests + memoria del repo, automático, sin intervención
6. Certificación   → (gate) si no aprueba, el flujo se detiene acá
7. Documentación   → (pausa antes de Confluence) se actualiza la memoria del repo y, si aplica, Confluence
8. Finalización    → resumen y memoria del componente al día
```

## Por qué hay pausas justo ahí

Las pausas en Análisis y Diseño existen porque son los puntos donde corregir el rumbo es
barato. Pausar después de implementar no tendría el mismo valor — ya se escribió el código.
La pausa antes de Confluence existe porque Confluence es un sistema compartido con el resto de
la organización; el cambio en el repo (Git) no necesita esa pausa porque ya es revisable por
Pull Request.

## Qué significa que Contexto abra con un "gate" de producto

Antes de tocar la HU, Contexto resuelve determinísticamente a qué producto Klap pertenece vía
su épica Jira (`producto_por_epica`, contra los cursores de `sources.yaml` en la memoria — ver
`agents/documentador-klap.md`, Flujo 0). Si no existe, la fase **se detiene ahí**: dispara
`/klap:memoria-inicializar` y espera la pausa humana obligatoria de esa skill antes de
continuar. Es deliberado — analizar y diseñar sin memoria de producto resuelta produce trabajo
que después hay que reconciliar a mano.

## Qué significa que Certificación sea un "gate"

No es una sugerencia del modelo — es un veredicto que produce un script determinista
(`scripts/quality-gate.mjs`) comparando evidencia real contra los umbrales de
`config/quality-gates.yaml`. Si el veredicto es negativo, el flujo no continúa a
Documentación, y además el hook de `git push` bloqueará el push en la rama de esa HU hasta que
exista una certificación aprobada (ver `docs/troubleshooting.md`).

## Retomar un flujo interrumpido

Cada fase deja su artefacto en `.klap/hu/<ISSUE-KEY>/` (`contexto.md`, `analisis.md`,
`diseno.md`, `validacion.json`, `certificacion.json`). Si la sesión se corta, esos archivos
quedan ahí — puedes retomar sin repetir fases ya completadas.

## Evaluar el criterio de los agentes

`npm test` valida el andamiaje determinista (schemas, scripts, hooks) — no si un agente
razona bien. Para eso hay 6 casos de `claude plugin eval` (¿`analista` reporta una ambigüedad
real como pregunta pendiente en vez de resolverla por su cuenta?, ¿`arquitecto` prioriza el
patrón existente del componente?, ¿`seguridad` detecta una inyección SQL real?).

**Hoy no es un paso del flujo:** `claude plugin eval` está en early access habilitado por
organización, así que el kit no lo declara y los casos viven en `docs/futuro/evals/`. Ficha de
reactivación y checklist en `docs/claude-plugin-eval.md`.
