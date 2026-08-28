#!/usr/bin/env node
/**
 * Auditoría estática de configuración Kafka contra el checklist de
 * standards/mensajeria/kafka-avanzado.md. Alcance deliberado, igual a lo descrito en el
 * roadmap: reglas de texto simples sobre `*KafkaConfig.java` (ackMode, acks, idempotencia,
 * deserializer, metrics-push, max.poll.records) — propiedades verificables sin ambigüedad.
 *
 * Fuera de alcance a propósito: el comportamiento de listener/producer (orden de ack, que el
 * catch relanze, envío síncrono a DLQ) vive en la clase de negocio, no en su config, y depende
 * del flujo real del código — sigue siendo criterio del agente `seguridad`/`certificador` sobre
 * el diff, igual división de responsabilidad que scripts/deps-scan.mjs con Trivy/OWASP.
 *
 * Uso: node scripts/auditar-kafka.mjs <ruta-repo>
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { readYaml } from "./lib/yaml-io.mjs";
import { algunaCondicionCumple } from "./lib/gates.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

const DIRS_EXCLUIDOS = new Set(["node_modules", "target", "build", "out", ".git"]);

export function encontrarKafkaConfigs(repoPath) {
  const encontrados = [];
  const recorrer = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!DIRS_EXCLUIDOS.has(entry.name)) recorrer(path.join(dir, entry.name));
      } else if (/KafkaConfig\.java$/.test(entry.name)) {
        encontrados.push(path.join(dir, entry.name));
      }
    }
  };
  if (existsSync(repoPath)) recorrer(repoPath);
  return encontrados;
}

// Cada regla sólo se evalúa si `aplica` (marcador de que el archivo configura esa pieza),
// para no exigir p.ej. config de producer en un archivo que sólo configura un consumer.
const REGLAS = [
  {
    id: "ack-mode-manual",
    severidad: "HIGH",
    aplica: (c) => /ConsumerConfig|getConsumerProperties|ContainerProperties/.test(c),
    cumple: (c) => /\bMANUAL\b/.test(c),
    mensaje: "ackMode no está en MANUAL — sin control explícito de commit no hay at-least-once real.",
  },
  {
    id: "metrics-push-false",
    severidad: "CRITICAL",
    aplica: (c) => /ConsumerConfig|getConsumerProperties/.test(c),
    cumple: (c) => /enable\.metrics\.push[\s\S]{0,20}false/i.test(c),
    mensaje: "enable.metrics.push=false no encontrado — riesgo de OOM progresivo en MSK/Confluent Cloud (KIP-714).",
  },
  {
    id: "error-handling-deserializer",
    severidad: "HIGH",
    aplica: (c) => /JsonDeserializer/.test(c),
    cumple: (c) => /ErrorHandlingDeserializer/.test(c),
    mensaje: "JsonDeserializer sin envolver en ErrorHandlingDeserializer — un mensaje malformado puede crashear el consumer en vez de ir a DLQ.",
  },
  {
    id: "producer-acks-all",
    severidad: "HIGH",
    aplica: (c) => /ProducerConfig|getProducerProperties/.test(c),
    cumple: (c) => /\backs\b[\s\S]{0,15}all/i.test(c),
    mensaje: "acks=all no encontrado en la config de producer — riesgo de pérdida de mensajes ante fallo de broker.",
  },
  {
    id: "producer-idempotence",
    severidad: "HIGH",
    aplica: (c) => /ProducerConfig|getProducerProperties/.test(c),
    cumple: (c) => /enable\.idempotence[\s\S]{0,20}true|ENABLE_IDEMPOTENCE_CONFIG[\s\S]{0,30}true/i.test(c),
    mensaje: "enable.idempotence=true no encontrado en la config de producer — riesgo de duplicados en reintentos.",
  },
  {
    id: "max-poll-records-1",
    severidad: "MEDIUM",
    aplica: (c) => /ConsumerConfig|getConsumerProperties/.test(c),
    cumple: (c) => /max\.poll\.records[\s\S]{0,15}\b1\b|MAX_POLL_RECORDS_CONFIG[\s\S]{0,20}\b1\b/.test(c),
    mensaje: "max.poll.records=1 no encontrado — lotes grandes pueden causar timeouts por max.poll.interval.ms.",
  },
];

export function auditarContenido(contenido, archivo) {
  const hallazgos = [];
  for (const regla of REGLAS) {
    if (!regla.aplica(contenido) || regla.cumple(contenido)) continue;
    hallazgos.push({ archivo, regla: regla.id, severidad: regla.severidad, mensaje: regla.mensaje });
  }
  return hallazgos;
}

export function auditarArchivo(rutaArchivo) {
  return auditarContenido(readFileSync(rutaArchivo, "utf8"), rutaArchivo);
}

export function evaluarHallazgos(hallazgos, gates = readYaml(resolveFromRoot("config", "quality-gates.yaml"))) {
  const bloqueantes = hallazgos.filter((h) => algunaCondicionCumple(gates.kafka.bloquear_si, h, gates.escalas));
  return { aprobado: bloqueantes.length === 0, total_hallazgos: hallazgos.length, bloqueantes };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const repoPath = process.argv[2];
  if (!repoPath) {
    console.error("Uso: node scripts/auditar-kafka.mjs <ruta-repo>");
    process.exit(1);
  }
  const archivos = encontrarKafkaConfigs(repoPath);
  const hallazgos = archivos.flatMap(auditarArchivo);
  const veredicto = evaluarHallazgos(hallazgos);
  console.log(JSON.stringify({ archivos_encontrados: archivos.length, ...veredicto }, null, 2));
  process.exit(veredicto.aprobado ? 0 : 1);
}
