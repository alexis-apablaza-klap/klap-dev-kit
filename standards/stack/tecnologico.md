---
titulo: "Stack tecnológico Klap — cómo se usa, no sólo qué es"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [stack, java, spring-boot, angular, postgresql, kafka, aws]
---

# Stack tecnológico Klap

Las versiones soportadas viven **exclusivamente** en `config/klap.yaml` → `stack_soportado`.
Este documento no las repite — repetirlas aquí crearía dos fuentes de verdad que
inevitablemente se desincronizan. Léelo si necesitas la versión exacta; lo que sigue es
**cómo** se usa cada pieza en un componente Klap típico.

## Backend — Java 21 / Spring Boot / Gradle

- **Java 21 Virtual Threads**: usar para I/O bloqueante (llamadas HTTP salientes, JDBC) en vez
  de reactividad forzada cuando el equipo no tiene ya una base reactiva. No migrar código
  reactivo existente sólo por adoptar virtual threads — evaluar caso a caso (`CONTEXT_DEPENDENT`).
- **Spring Boot**: arranque por capas (ver `standards/arquitectura`), configuración externa vía
  Spring Cloud Config (repo de properties centralizado, nunca `application.yml` con secretos
  embebidos).
- **Gradle**: `build.gradle`/`build.gradle.kts` como fuente de verdad de dependencias.
  Preferir el wrapper (`./gradlew`) sobre una instalación global — es lo que
  `scripts/ejecutar-tests.mjs` de este kit asume por defecto.
- **AWS Lambda**: cuando el componente es una función Lambda en vez de un microservicio
  siempre-encendido, el ciclo de vida (cold start, timeout, memoria) condiciona decisiones que
  no aplican a Spring Boot tradicional — evaluarlo explícitamente en la fase de diseño.

## Frontend — Angular / TypeScript

Klap sólo fija el piso de versión (`config/klap.yaml` → `stack_soportado.frontend.angular`);
el detalle de qué es idiomático hoy se consulta en vivo, no en un standard estático — ver
`standards/stack/angular-typescript.md`. La versión de Angular activa determina qué patrones de
reactividad son correctos (Signals vs RxJS clásico) — el `arquitecto` debe verificar la
versión real del proyecto antes de recomendar un patrón, no asumir la última disponible.

## Datos — PostgreSQL

Ver `standards/datos/postgresql.md`. PostgreSQL es el motor único declarado para `contable` y
`mc_tlog` (repos transversales) — cualquier componente que necesite persistencia propia debe
justificar por qué no usa el esquema/base ya existente antes de crear uno nuevo.

## Mensajería — Confluent Kafka

Ver `standards/mensajeria/kafka-avanzado.md` (heredado, pendiente de revisión) para el detalle
operacional (DLQ, AckMode, tuning). A nivel de stack: Kafka es el mecanismo de integración
asíncrona por defecto entre componentes Klap; REST síncrono es la excepción cuando la
consistencia inmediata lo exige.

## CI — GitHub Actions (hoy), portabilidad a Bitbucket

El proveedor de CI vive en `config/klap.yaml` → `stack_soportado.ci.proveedor` y puede migrar.
Por eso toda la lógica de validación (tests, coverage, Sonar, deps-scan, auditoría Kafka,
secretos) vive en
`scripts/*.mjs` de este kit, no en el YAML del pipeline — el YAML sólo invoca los scripts. Ver
`standards/git-cicd/flujo-y-pipeline.md`.

## Regla general

Ante una duda de "¿qué versión/librería uso?", el orden es: `config/klap.yaml` →
`component.yaml` del repo (si ya fija algo distinto y justificado) → preguntar al equipo. Nunca
asumir una versión por conocimiento genérico del framework.
