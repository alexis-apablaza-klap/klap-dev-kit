/klap:disenar

No hay un `analisis.md` real en disco para este caso — trabaja sobre el análisis ya resuelto
que se entrega abajo, tal como permite `skills/disenar/SKILL.md` cuando no existe un archivo
formal, y dilo explícitamente en la salida.

**Componente:** `ms-central-sva-anticipo-calculos` (Java 21 / Spring Boot 4.x / Gradle).

**Contexto del componente:** ya usa Resilience4j para circuit breaker + retry en sus llamadas
salientes a otros microservicios — es el patrón usado consistentemente en las 3 integraciones
existentes del componente.

**Requisito:** la nueva integración con el servicio de scoring de `impulso-klap` necesita
tolerancia a fallos (timeout, reintentos, circuit breaker) porque ese servicio tiene un SLA
menos confiable que las integraciones actuales.

**Nota adicional del equipo:** existe la opción de introducir Spring Cloud Circuit Breaker con
un adapter distinto (p.ej. Sentinel), que en benchmarks recientes muestra mejor rendimiento
bajo alta concurrencia — pero el componente no lo usa hoy en ninguna integración.

Diseña la fase de Diseño (`diseno.md`) para este requisito.
