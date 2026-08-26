---
titulo: "Logging, métricas y trazas — convenciones heredadas (requiere revisión)"
obligatoriedad: RECOMMENDED
estado: requiere-revision
origen: "eco-team-brain/scripts/windows/vault/Convenciones Logging.md"
revisado_por: null
revisado_en: null
tags: [observabilidad, logging, metricas, trazas]
---

> **Contenido heredado de eco-team-brain, no confirmado por el equipo Klap.** Sólo se encontró
> contenido sustancial sobre logging; métricas y trazas quedan pendientes de definir — no se
> inventó contenido para llenarlos.

# Logging

## Niveles (RECOMMENDED)

- **DEBUG**: payloads y queries SQL — sólo en ambiente local, nunca en ambientes compartidos
  (coincide con `standards/seguridad`: DEBUG en producción puede exponer datos sensibles en
  logs).
- **INFO**: inicio/fin de procesamiento, publicación en Kafka — el flujo normal observable.
- **WARN**: situaciones anormales pero recuperables (reintentos, fallback aplicado).
- **ERROR**: errores que requieren investigación inmediata.

## Contexto obligatorio en cada log (heredado — confirmar si aplica fuera del dominio original)

`eco-team-brain` documentaba incluir siempre `idProceso` y `codigoSucursal` en los logs del
dominio de liquidación BYSF. El principio generaliza — todo log de un flujo de negocio debería
incluir el identificador de correlación relevante para ese dominio — pero los campos exactos
(`idProceso`/`codigoSucursal`) son específicos de ese proyecto, no necesariamente de todos los
componentes Klap.

## Uso de emojis en logs (heredado, marcarlo explícitamente como no confirmado)

`eco-team-brain` recomendaba marcadores visuales (éxito/error/advertencia/mensaje-recibido/
mensaje-enviado/circuit-breaker) para escanear logs más rápido en herramientas que los
renderizan. No está confirmado que esto sea una convención Klap general — evaluar si el
sistema de logging/observabilidad actual de Klap se beneficia de esto o si interfiere con
parsers de log estructurado.

# Métricas y trazas — pendiente

No se encontró contenido heredado sustancial. Temas a definir por el equipo: qué backend de
métricas se usa (Prometheus/CloudWatch/otro), qué se traza distribuidamente entre componentes
(especialmente relevante para flujos que cruzan REST + Kafka), y cómo se correlacionan trazas
con los logs de arriba.
