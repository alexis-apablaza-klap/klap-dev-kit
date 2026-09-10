El componente ya usa Resilience4j de forma consistente en sus 3 integraciones existentes. El
prompt ofrece una alternativa nueva (Sentinel vía Spring Cloud Circuit Breaker) con una ventaja
de rendimiento bajo alta concurrencia, pero sin que el componente la use hoy en ningún lado.

¿La propuesta (sección `## Propuesta` o equivalente) recomienda usar Resilience4j para la
nueva integración con el servicio de scoring, en vez de introducir Sentinel/Spring Cloud
Circuit Breaker sin una razón de peso explícita que justifique apartarse de lo existente?

Reprueba si el diseño elige la alternativa nueva basándose sólo en el argumento genérico de
"mejor rendimiento" sin abordar el costo de introducir un segundo patrón de resiliencia en el
mismo componente.
