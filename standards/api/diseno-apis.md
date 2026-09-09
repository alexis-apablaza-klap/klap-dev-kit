---
titulo: "Diseño de APIs — REST y compatibilidad"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [api, rest, openapi, compatibilidad]
---

# Diseño de APIs

## REST

- **Versionado**: en la ruta (`/v1/...`) cuando se anticipa un cambio incompatible futuro; un
  cambio incompatible sin versión nueva rompe a todos los consumidores existentes.
- **Códigos de estado**: usar el código HTTP que corresponde semánticamente (`404` recurso no
  existe, `409` conflicto de estado, `422` entidad válida pero regla de negocio la rechaza,
  `400` sólo para entrada malformada) — no todo error es `500` ni todo es `400`.
- **Paginación**: cursor-based para colecciones grandes (ver `standards/datos/postgresql.md`),
  con metadatos explícitos de si hay más páginas.

## Idempotencia (MANDATORY en flujos financieros)

Operaciones que pueden reintentarse (por timeout del cliente, por ejemplo) deben ser
idempotentes o exponer una clave de idempotencia — crítico en flujos financieros donde un
reintento no debe duplicar un pago/anticipo.

Exponer la clave no es suficiente por sí sola: el servidor debe **persistirla** (p.ej. una
tabla `idempotency_key` con el resultado de la primera ejecución) y, si la misma clave llega de
nuevo, **devolver la respuesta original guardada en vez de reprocesar la operación** — nunca
ejecutar la lógica de negocio una segunda vez sólo porque el cliente reintentó. Sin este
segundo paso, la clave de idempotencia es un campo decorativo que no previene nada.

## Compatibilidad hacia atrás (MANDATORY — política Klap, sin excepción tácita)

Contratos REST y esquemas de eventos Kafka deben mantener compatibilidad hacia atrás
estrictamente. Esto significa, como mínimo:

- Agregar un campo opcional: compatible.
- Eliminar o renombrar un campo existente: **incompatible** — requiere versión nueva y período
  de convivencia, no un cambio directo.
- Cambiar el tipo de un campo existente: **incompatible**.
- Agregar un nuevo tipo de evento a un topic ya consumido por otros: verificar que los
  consumidores existentes ignoran tipos desconocidos sin fallar antes de asumir que es seguro.

Si el `arquitecto` detecta que un cambio propuesto rompe compatibilidad, debe señalarlo
explícitamente en `diseno.md` como riesgo — no es una decisión que se tome implícitamente
durante la implementación.

## Formato de error (MANDATORY)

Todo error (4xx/5xx) de cualquier API expuesta por un componente Klap responde con el mismo
envelope, sin excepción de componente:

```json
{
  "code": 400,
  "message": "Descripción legible del error",
  "date": "2026-08-26",
  "time": "14:32:11.45"
}
```

- `code`: el mismo código HTTP de la respuesta — no un código de negocio distinto.
- `message`: descripción legible del error, nunca un stack trace ni detalle interno (ver
  `standards/seguridad/owasp-y-secretos.md` → exposición de información).
- `date`/`time`: fecha (`YYYY-MM-DD`) y hora (`HH:mm:ss.SS`, centésimas de segundo) del servidor
  al momento de generar la respuesta — misma zona horaria en todos los componentes (a
  confirmar por el equipo cuál).

## OpenAPI como contrato fuente de verdad (MANDATORY para APIs expuestas)

El OpenAPI del componente (ubicado en el repo, referenciado desde `docs/context/index.yaml`)
es lo que describe el comportamiento real de la API — se actualiza como parte del mismo cambio
que modifica el endpoint, no después. Un endpoint sin reflejo en el OpenAPI no está
correctamente documentado aunque funcione.
