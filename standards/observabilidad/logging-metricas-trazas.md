---
titulo: "Logging, métricas y trazas"
obligatoriedad: RECOMMENDED
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [observabilidad, logging, metricas, trazas]
---

# Logging

## Niveles (RECOMMENDED)

- **DEBUG**: payloads y queries SQL — sólo en ambiente local, nunca en ambientes compartidos
  (coincide con `standards/seguridad`: DEBUG en producción puede exponer datos sensibles en
  logs).
- **INFO**: inicio/fin de procesamiento, publicación en Kafka — el flujo normal observable.
- **WARN**: situaciones anormales pero recuperables (reintentos, fallback aplicado).
- **ERROR**: errores que requieren investigación inmediata.

# Métricas y trazas — pendiente

No hay contenido definido aún. Temas a definir por el equipo: qué backend de métricas se usa
(Prometheus/CloudWatch/otro), qué se traza distribuidamente entre componentes (especialmente
relevante para flujos que cruzan REST + Kafka), y cómo se correlacionan trazas con los logs de
arriba.
