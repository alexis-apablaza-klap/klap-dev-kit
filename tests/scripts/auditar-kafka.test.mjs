import test from "node:test";
import assert from "node:assert/strict";
import { auditarContenido, evaluarHallazgos } from "../../scripts/auditar-kafka.mjs";

const gates = {
  escalas: { severidad: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
  kafka: { bloquear_si: [{ campo: "severidad", operador: ">=", valor: "HIGH", escala: "severidad" }] },
};

const CONSUMER_COMPLETO = `
class VentaKafkaConfig {
  ConsumerConfig getConsumerProperties() {
    props.put("enable.metrics.push", "false");
    props.put("max.poll.records", "1");
    factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
    var deserializer = new ErrorHandlingDeserializer<>(new JsonDeserializer<>(Venta.class));
  }
}
`;

const PRODUCER_COMPLETO = `
class VentaKafkaConfig {
  ProducerConfig getProducerProperties() {
    props.put("acks", "all");
    props.put("enable.idempotence", "true");
  }
}
`;

test("consumer config completo no genera hallazgos", () => {
  const hallazgos = auditarContenido(CONSUMER_COMPLETO, "VentaKafkaConfig.java");
  assert.deepEqual(hallazgos, []);
});

test("producer config completo no genera hallazgos", () => {
  const hallazgos = auditarContenido(PRODUCER_COMPLETO, "VentaKafkaConfig.java");
  assert.deepEqual(hallazgos, []);
});

test("consumer sin ackMode MANUAL, sin metrics-push y sin max.poll.records genera 3 hallazgos HIGH/CRITICAL/MEDIUM", () => {
  const contenido = `
    class Config {
      ConsumerConfig getConsumerProperties() {
        props.put("otro", "valor");
      }
    }
  `;
  const hallazgos = auditarContenido(contenido, "Config.java");
  const ids = hallazgos.map((h) => h.regla).sort();
  assert.deepEqual(ids, ["ack-mode-manual", "max-poll-records-1", "metrics-push-false"]);
});

test("JsonDeserializer sin ErrorHandlingDeserializer genera hallazgo HIGH", () => {
  const contenido = `new JsonDeserializer<>(Venta.class)`;
  const hallazgos = auditarContenido(contenido, "Config.java");
  assert.deepEqual(hallazgos.map((h) => h.regla), ["error-handling-deserializer"]);
});

test("producer sin acks=all ni idempotencia genera 2 hallazgos HIGH", () => {
  const contenido = `
    class Config {
      ProducerConfig getProducerProperties() {
        props.put("otro", "valor");
      }
    }
  `;
  const hallazgos = auditarContenido(contenido, "Config.java");
  const ids = hallazgos.map((h) => h.regla).sort();
  assert.deepEqual(ids, ["producer-acks-all", "producer-idempotence"]);
});

test("archivo sin ninguna config de consumer/producer/deserializer no genera hallazgos (reglas no aplican)", () => {
  const hallazgos = auditarContenido("class Cosa { void metodo() {} }", "Cosa.java");
  assert.deepEqual(hallazgos, []);
});

test("evaluarHallazgos: HIGH/CRITICAL bloquean, MEDIUM no", () => {
  const soloMedium = [{ archivo: "a", regla: "max-poll-records-1", severidad: "MEDIUM", mensaje: "x" }];
  const veredictoMedium = evaluarHallazgos(soloMedium, gates);
  assert.equal(veredictoMedium.aprobado, true);
  assert.equal(veredictoMedium.total_hallazgos, 1);

  const conHigh = [...soloMedium, { archivo: "a", regla: "ack-mode-manual", severidad: "HIGH", mensaje: "y" }];
  const veredictoHigh = evaluarHallazgos(conHigh, gates);
  assert.equal(veredictoHigh.aprobado, false);
  assert.equal(veredictoHigh.bloqueantes.length, 1);
});

test("evaluarHallazgos: sin hallazgos aprueba", () => {
  const veredicto = evaluarHallazgos([], gates);
  assert.equal(veredicto.aprobado, true);
  assert.equal(veredicto.total_hallazgos, 0);
});
