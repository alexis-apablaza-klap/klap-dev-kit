---
titulo: "Kafka avanzado — configuración, DLQ y testing"
obligatoriedad: RECOMMENDED
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [kafka, mensajeria, eventos]
---

# Kafka

## Patrón general

Una clase base `KafkaConfig` (paquete `global/config`, **sin** `@Configuration`) con métodos
factory reutilizables (`getConsumerProperties`, `getProducerProperties`,
`createListenerContainerFactoryWithDlq`, etc.), extendida por una `{Dominio}KafkaConfig`
concreta (con `@Configuration` + `@EnableKafka`) por cada dominio/topic. Nunca duplicar
configuración Kafka copiando la clase base — siempre extenderla.

## Configuración de consumer

- `ackMode = MANUAL` — control explícito de commit, at-least-once real.
- `max.poll.records = 1` — procesa de a uno, evita timeouts por lotes grandes.
- `max.poll.interval.ms` ajustado al tiempo real de procesamiento (local: ~5min, ambientes
  productivos con procesamiento pesado: hasta 1h) — si el procesamiento supera el intervalo,
  Kafka expulsa al consumer del grupo.
- `ErrorHandlingDeserializer` envolviendo `JsonDeserializer` — mensajes malformados van a DLQ
  automáticamente en vez de crashear el consumer.
- `enable.metrics.push = false` — **crítico** en MSK/Confluent Cloud: sin esto, el reporter de
  telemetría (KIP-714) puede provocar OOM progresivo bajo presión de heap.

## Configuración de producer

- `acks = all` — sin esto se pueden perder mensajes ante fallo de broker.
- `enable.idempotence = true` — evita duplicados en reintentos.
- Envío **síncrono** (`.send(...).get()`) en dominios financieros — nunca fire-and-forget, para
  garantizar consistencia antes de continuar el flujo.
- `retries` y `max.request.size` leídos desde `@Value` (configurables por ambiente), nunca como
  constante Java hardcodeada — de lo contrario el properties del ambiente se ignora.
- `linger.ms = 0` cuando el envío es síncrono — con `.get()` no hay batching real, `linger > 0`
  sólo agrega latencia.

## Manejo de errores y DLQ

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

## Topics y consumer groups

- Naming: `{dominio}-input-topic`, `{dominio}-output-topic`, `dlq-{topic-entrada}` para la DLQ,
  `{dominio}-consumer-group` (sufijo `-local` en el perfil local).
- El `group-id` debe ser **idéntico** entre ambientes/deploys — si cambia, los offsets se
  resetean y el consumer reprocesa desde el inicio.
- No crear múltiples consumer groups para el mismo topic sin justificación documentada — cada
  grupo adicional reprocesa el topic completo desde su propio offset.
- Clave de partición: el identificador de negocio que garantiza orden para ese dominio (p.ej.
  RUT del comercio) — una clave incorrecta rompe el orden garantizado entre mensajes
  relacionados.

## Seguridad por ambiente

- Local: `PLAINTEXT`, sin credenciales.
- Develop/QA/Master: `SASL_SSL` con credenciales vía variables de entorno
  (`${VAR:fallback}`), nunca en texto plano en el repositorio.

## Testing — casos mínimos esperados

Para el listener: caso éxito (servicio invocado + ack), caso mensaje `null` (ack sin invocar
servicio), caso excepción (ack **no** invocado, excepción propagada), y caso de orden
(`InOrder`: servicio antes que ack). Para el producer: envío exitoso con la clave de partición
correcta, y error de envío que resulta en la excepción de dominio esperada (no la excepción
cruda del cliente Kafka).

## Auditoría de cumplimiento — `scripts/auditar-kafka.mjs`

Reglas estáticas de texto sobre `*KafkaConfig.java` (ackMode, `enable.metrics.push`,
`ErrorHandlingDeserializer`, `acks`, `enable.idempotence`, `max.poll.records`), clasificadas
por severidad y evaluadas contra `config/quality-gates.yaml` → `kafka.bloquear_si` — mismo
patrón que `scripts/deps-scan.mjs` con dependencias. Invocado por el agente `seguridad` en la
fase de Certificación.

Alcance deliberado: sólo config de `*KafkaConfig.java`. El comportamiento de listener/producer
(orden de ack, que el `catch` relance, envío síncrono a DLQ) depende del flujo real del código
de negocio, no de su config — sigue siendo criterio manual del agente `seguridad`/`certificador`
sobre el diff, no algo que un grep pueda verificar sin ambigüedad.
