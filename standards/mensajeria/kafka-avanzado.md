---
titulo: "Kafka avanzado — estándar heredado (requiere revisión)"
obligatoriedad: RECOMMENDED
estado: requiere-revision
origen: "eco-team-brain/scripts/windows/vault/Kafka Config Standard.md, Kafka Topics Standard.md; eco-team-brain/commands/kafka-implement/SKILL.md, kafka-audit/SKILL.md"
revisado_por: null
revisado_en: null
tags: [kafka, mensajeria, eventos]
---

> **Contenido heredado de eco-team-brain, no confirmado como estándar Klap general.**
> Documentado originalmente para el dominio de liquidación BYSF sobre AWS MSK/Confluent Cloud
> con Spring Kafka. Es detallado, específico y operacionalmente valioso — se condensa aquí
> completo en vez de descartarlo, pero cada punto debe confirmarse contra el componente Kafka
> real que se esté auditando/implementando antes de tratarlo como obligatorio.

# Kafka — patrón heredado

## Patrón general

Una clase base `KafkaConfig` (paquete `global/config`, **sin** `@Configuration`) con métodos
factory reutilizables (`getConsumerProperties`, `getProducerProperties`,
`createListenerContainerFactoryWithDlq`, etc.), extendida por una `{Dominio}KafkaConfig`
concreta (con `@Configuration` + `@EnableKafka`) por cada dominio/topic. Nunca duplicar
configuración Kafka copiando la clase base — siempre extenderla.

## Configuración de consumer (heredado)

- `ackMode = MANUAL` — control explícito de commit, at-least-once real.
- `max.poll.records = 1` — procesa de a uno, evita timeouts por lotes grandes.
- `max.poll.interval.ms` ajustado al tiempo real de procesamiento (local: ~5min, ambientes
  productivos con procesamiento pesado: hasta 1h) — si el procesamiento supera el intervalo,
  Kafka expulsa al consumer del grupo.
- `ErrorHandlingDeserializer` envolviendo `JsonDeserializer` — mensajes malformados van a DLQ
  automáticamente en vez de crashear el consumer.
- `enable.metrics.push = false` — **crítico** en MSK/Confluent Cloud: sin esto, el reporter de
  telemetría (KIP-714) puede provocar OOM progresivo bajo presión de heap.

## Configuración de producer (heredado)

- `acks = all` — sin esto se pueden perder mensajes ante fallo de broker.
- `enable.idempotence = true` — evita duplicados en reintentos.
- Envío **síncrono** (`.send(...).get()`) en dominios financieros — nunca fire-and-forget, para
  garantizar consistencia antes de continuar el flujo.
- `retries` y `max.request.size` leídos desde `@Value` (configurables por ambiente), nunca como
  constante Java hardcodeada — de lo contrario el properties del ambiente se ignora.
- `linger.ms = 0` cuando el envío es síncrono — con `.get()` no hay batching real, `linger > 0`
  sólo agrega latencia.

## Manejo de errores y DLQ (heredado)

- Reintentos con backoff fijo (patrón: 3 intentos, 5s) antes de enviar a DLQ.
- `NonRetryableClientDataException` para errores deterministas de negocio → DLQ inmediato, sin
  reintentos (reintentar un error de negocio no lo va a resolver).
- Clasificar explícitamente: errores deterministas (de negocio) → DLQ directo; errores de
  infraestructura (timeout, conexión) → dejar que el error handler reintente.
- El envío a DLQ es síncrono (`.get()`) — un envío async a DLQ que falla en silencio pierde el
  mensaje original sin dejar rastro.
- En el listener: si el mensaje es `null`, hacer `acknowledgment.acknowledge()` **antes** de
  descartar — omitir esto causa un bucle infinito de reentrega (el offset nunca avanza).
- El `acknowledge()` va **después** del procesamiento exitoso, nunca antes.
- El `catch` del listener debe **relanzar** la excepción (`throw e`) — si la captura sin
  relanzar, el mensaje nunca llega al error handler ni al DLQ.

## Topics y consumer groups (heredado)

- Naming: `{dominio}-input-topic`, `{dominio}-output-topic`, `dlq-{topic-entrada}` para la DLQ,
  `{dominio}-consumer-group` (sufijo `-local` en el perfil local).
- El `group-id` debe ser **idéntico** entre ambientes/deploys — si cambia, los offsets se
  resetean y el consumer reprocesa desde el inicio.
- No crear múltiples consumer groups para el mismo topic sin justificación documentada — cada
  grupo adicional reprocesa el topic completo desde su propio offset.
- Clave de partición: el identificador de negocio que garantiza orden (p.ej. código de
  sucursal, RUT del comercio) — una clave incorrecta rompe el orden garantizado entre mensajes
  relacionados.

## Seguridad por ambiente (heredado)

- Local: `PLAINTEXT`, sin credenciales.
- Develop/QA/Master: `SASL_SSL` con credenciales vía variables de entorno
  (`${VAR:fallback}`), nunca en texto plano en el repositorio.

## Testing (heredado — casos mínimos esperados)

Para el listener: caso éxito (servicio invocado + ack), caso mensaje `null` (ack sin invocar
servicio), caso excepción (ack **no** invocado, excepción propagada), y caso de orden
(`InOrder`: servicio antes que ack). Para el producer: envío exitoso con la clave de partición
correcta, y error de envío que resulta en la excepción de dominio esperada (no la excepción
cruda del cliente Kafka).

## Auditoría de cumplimiento

`eco-team-brain` incluía un skill `kafka-audit` que revisa una implementación existente contra
esta checklist con severidades (Crítica/Alta/Media/Baja). Si Klap decide adoptar este patrón
como estándar confirmado, vale la pena portar esa auditoría como parte del agente `certificador`
o `seguridad` de este kit — no está portada en esta v1.
