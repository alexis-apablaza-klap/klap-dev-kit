---
titulo: "Seguridad — OWASP Top 10 y gestión de secretos"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [seguridad, owasp, secretos, pan]
---

# Seguridad

Controles reproducibles (dependencias vulnerables, secretos en el diff) los aplican
`scripts/deps-scan.mjs` y `scripts/escanear-secretos.mjs` — este documento es la guía de
criterio para lo que un script no puede evaluar: el `agente seguridad` lo usa como checklist,
no como sustituto de leer el diff.

## Controles OWASP relevantes (MANDATORY todos, aplicar el que corresponda al cambio)

- **Validación de entrada**: validar en el borde del sistema (controller/listener), nunca
  confiar en que el caller ya validó. Usar `@Valid`/Bean Validation en DTOs de entrada.
- **AuthN/AuthZ**: verificar que el endpoint/operación exige el nivel de autenticación y
  autorización correcto — no asumir que un filtro global ya lo cubre sin confirmarlo.
- **SQL injection**: parámetros bindeados siempre (`?` con `JdbcTemplate`/PreparedStatement),
  nunca concatenación de SQL con entrada de usuario.
- **SSRF**: si el componente hace requests salientes a una URL derivada de entrada externa,
  validar contra una allowlist — no seguir redirects ciegamente hacia destinos arbitrarios.
- **XSS**: relevante en el frontend Angular — Angular escapa por defecto; el riesgo real está
  en `[innerHTML]`/`bypassSecurityTrust*` usados sin sanitizar.
- **Deserialización insegura**: `ErrorHandlingDeserializer` + tipos explícitos en consumers
  Kafka (ver `standards/mensajeria/kafka-avanzado.md`), nunca deserializar a `Object`/tipos
  abiertos desde una fuente no confiable.
- **Criptografía**: nunca implementar cifrado propio; usar las librerías estándar del stack y
  algoritmos vigentes (no MD5/SHA1 para nada sensible).
- **Logging seguro**: ver sección PAN abajo.
- **Exposición de información**: mensajes de error hacia el cliente no deben incluir stack
  traces, rutas internas ni detalles de infraestructura — loguearlos internamente, devolver un
  mensaje genérico con un id de correlación.
- **Dependencias vulnerables**: `scripts/deps-scan.mjs` bloquea CRITICAL/HIGH según
  `config/quality-gates.yaml`; MEDIUM/LOW se reportan sin bloquear pero no se ignoran.

## Gestión de secretos (MANDATORY, sin excepción)

- Cero credenciales hardcodeadas en código, properties versionados o tests.
- Resolución exclusiva vía **AWS Secrets Manager** o **Spring Cloud Config** — ninguna otra
  fuente.
- `scripts/escanear-secretos.mjs` bloquea el commit si detecta un patrón de secreto; el hook
  `pre-commit-secret-scan.mjs` lo aplica automáticamente.

## PAN masking (MANDATORY)

Ningún log, traza o mensaje de error puede exponer un PAN (número de tarjeta) completo en
claro — sólo los últimos 4 dígitos (`****1234`). El resto de los datos de dominio (ids, montos,
etc.) se asume ya tratado antes de llegar a este punto — este documento no exige masking
general de PII. Antes de loguear un objeto de dominio, verificar si contiene un PAN explícito y
enmascararlo, en vez de loguear el objeto completo por comodidad.

**Mal**: `log.info("Procesando venta: {}", venta);` (si `venta` tiene el PAN sin enmascarar en
su `toString()`).
**Bien**: `log.info("Procesando venta id={}, comercio={}", venta.getId(), venta.getComercioId());`
— sólo los campos necesarios para trazabilidad, nunca el objeto completo por defecto.

## Excepciones

Si una dependencia vulnerable no tiene reemplazo disponible en el corto plazo, la excepción
debe quedar registrada explícitamente (justificación + plan de remediación), nunca asumida en
silencio — ver `config/quality-gates.yaml` → `dependencias.permitir_excepcion_explicita`.
