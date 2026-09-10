# Comandos

| Comando | Qué hace | Cuándo usarlo en vez del flujo completo |
|---|---|---|
| `/klap:trabajar-hu <ISSUE-KEY>` | Flujo completo de 9 fases: contexto → análisis → diseño → implementación → validación → certificación → documentación → finalización → retroalimentación. | Es el flujo por defecto para cualquier HU real. |
| `/klap:analizar <ISSUE-KEY o descripción>` | Sólo contexto + análisis. | Estimar, discutir alcance, o decidir si vale la pena abrir la HU — sin comprometerte a implementar. |
| `/klap:disenar [analisis.md]` | Sólo diseño, a partir de un análisis existente o una descripción. | Ya tienes claro el análisis (o es un cambio menor) y sólo necesitas la propuesta de solución. |
| `/klap:desarrollar [diseno.md]` | Sólo implementación, a partir de un diseño aprobado. | Cambios pequeños y acotados donde el diseño ya está resuelto o es trivial. |
| `/klap:certificar [repo] [ISSUE-KEY]` | Ejecuta tests, coverage, Sonar y escaneo de dependencias/seguridad; emite veredicto. | Quieres re-certificar sin repetir el resto del flujo (p.ej. tras un fix post-review). |
| `/klap:documentar [ISSUE-KEY]` | Actualiza memoria del repo y, si corresponde, Confluence. | Cerrar la documentación de un cambio que ya se implementó fuera del flujo completo. |
| `/klap:actualizar-componente [repo]` | Revisa el repo y propone/actualiza `docs/context/index.yaml`. | Onboarding de un repo nuevo al Dev-Kit, o poner al día la memoria de un repo que quedó desactualizada. |
| `/klap:consultar-estandar <tema>` | Busca y muestra sólo el estándar Klap relevante a un tema. | Consulta puntual (p.ej. "¿cuál es el estándar de logging?") sin arrancar ningún flujo. |
| `/klap:memoria-inicializar <producto>` | Construye la memoria inicial de un producto en Klap Knowledge, con pausa humana antes de aplicar. | Un producto Klap todavía no existe en Klap Knowledge. |
| `/klap:memoria-actualizar <producto\|ISSUE-KEY>` | Actualiza incrementalmente la memoria de un producto, sin releer todo. | Cerrar la actualización de memoria global fuera de `/klap:trabajar-hu`, o forzarla puntualmente. |
| `/klap:memoria-consultar <producto o pregunta>` | Responde usando la memoria consolidada de Klap Knowledge. | Consulta rápida sobre un producto, sus relaciones o su historial, sin arrancar ningún flujo. |
| `/klap:retroalimentar [ISSUE-KEY]` | Analiza cómo se ejecutó el flujo (traza + artefactos) y consolida `docs/mejoras-sugeridas.md`. | Revisar la fricción del **workflow** sin cerrar una HU nueva. Sin argumento, mira el acumulado de todas las HUs con traza. |

Cada comando puntual delega en el mismo agente que usa `/klap:trabajar-hu` en su fase
correspondiente — el comportamiento es el mismo, sólo cambia el alcance de lo que se ejecuta.
