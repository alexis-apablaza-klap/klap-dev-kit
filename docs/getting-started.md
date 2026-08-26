# Primer uso

## Correr `/klap:trabajar-hu` de punta a punta

```
/klap:trabajar-hu KLAP-123
```

Con el plugin recién instalado, el MCP mock de Klap Knowledge (`klap-knowledge-local-mock`)
ya está activo — no necesitas levantar nada aparte para probar el flujo completo con datos de
ejemplo (ver `mocks/klap-knowledge-mcp/fixtures/`).

Lo que vas a ver, fase por fase:

1. **Contexto** — el agente `analista` trae la HU desde Jira, identifica el/los producto(s) y
   trae el resumen de Klap Knowledge y de la memoria del repo (`component.yaml` +
   `docs/context/index.yaml`). Sin pausa.
2. **Análisis** — el mismo agente entrega hechos, supuestos, decisiones y preguntas
   pendientes. **Se detiene y te pide confirmación.** Si hay preguntas pendientes bloqueantes,
   respóndelas acá — el flujo no avanza asumiendo respuestas.
3. **Diseño** — el agente `arquitecto` propone la solución. **Se detiene de nuevo.** Revisa el
   diseño antes de aprobar: es el punto donde es más barato corregir el rumbo.
4. **Implementación** — el agente `desarrollador` escribe el código y las pruebas. Sin pausa,
   pero puedes interrumpir en cualquier momento como en cualquier sesión de Claude Code.
5. **Validación** — se ejecutan tests y validación de `component.yaml` de forma determinista
   (no es un agente, es `scripts/ejecutar-tests.mjs` y `scripts/validar-component.mjs`).
6. **Certificación** — `certificador` y `seguridad` reúnen evidencia real (tests, coverage,
   Sonar, dependencias) y `scripts/quality-gate.mjs` decide el veredicto. **Si no aprueba, el
   flujo se detiene ahí** — no llega a documentación con una certificación reprobada.
7. **Documentación** — el agente `documentador` actualiza `docs/` del repo. **Pausa antes de
   tocar Confluence**, si es que corresponde tocarlo.
8. **Finalización** — se actualiza `component.yaml`/el índice si hizo falta, y se entrega un
   resumen corto de qué se hizo y qué quedó pendiente.

Al final, si intentas `git push` en una rama con el issue en el nombre (p.ej.
`feature/KLAP-123-algo`) y la certificación no quedó aprobada, el hook de push lo bloquea —
ver `docs/troubleshooting.md`.

## Usar sólo una fase

No siempre hace falta el flujo completo. Por ejemplo, para estimar sin comprometerte a
implementar: `/klap:analizar KLAP-123`. Ver `docs/commands.md` para el resto de los comandos
puntuales y cuándo conviene cada uno en vez del flujo completo.
