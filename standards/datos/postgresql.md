---
titulo: "PostgreSQL — acceso a datos y performance"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [postgresql, datos, performance]
---

# PostgreSQL

## Indexación explícita (MANDATORY)

Toda columna usada en `WHERE`, `JOIN` o `ORDER BY` de una query no trivial debe tener un
índice deliberado — no asumir que Postgres "ya lo optimiza". Al agregar una query nueva o
modificar una existente con impacto en el plan de ejecución, correr `EXPLAIN ANALYZE` antes de
mergear y verificar que no aparece un `Seq Scan` sobre una tabla grande donde se esperaba un
`Index Scan`.

## Cero N+1 (MANDATORY)

**Mal**: iterar una lista de IDs y hacer una query por cada uno dentro del loop.
**Bien**: una sola query con `WHERE id IN (...)` o un join, trayendo todo lo necesario de una vez.

## Transacciones explícitas (MANDATORY)

`@Transactional` con límites claros: qué operaciones entran en la misma transacción y por qué.
No envolver un método completo en `@Transactional` "por si acaso" — una transacción larga
retiene locks más tiempo del necesario. Separar la parte transaccional (escritura) de la
no-transaccional (llamadas externas, cálculos) cuando sea posible.

## Naming de esquema/tabla (RECOMMENDED)

Consistente con lo que ya existe en `contable` y `mc_tlog` (repos transversales) — antes de
nombrar una tabla/columna nueva, revisar la convención ya en uso en el esquema del componente
en vez de inventar una propia.

## Migraciones (CONTEXT_DEPENDENT)

No hay confirmación en este kit de qué herramienta de migración es la oficial en todos los
componentes Klap — verificar en el `component.yaml`/repo específico (algunos ecosistemas Klap
han usado Dbmate históricamente; no asumirlo como default sin confirmarlo en el repo actual).
Lo que sí es `MANDATORY`: las migraciones son versionadas, incrementales y nunca se editan
retroactivamente una vez aplicadas en un ambiente compartido.

## Paginación (RECOMMENDED)

Para tablas grandes, preferir paginación por cursor (basada en clave) sobre `OFFSET/LIMIT`,
que degrada linealmente con el offset. Confirmar el tamaño real de la tabla antes de decidir —
no es necesario para tablas pequeñas de configuración.

---

## Convención heredada de eco-team-brain (pendiente de confirmación — no vigente)

`eco-team-brain` documentaba, para el dominio de liquidación BYSF, una preferencia por
`JdbcTemplate` puro sobre JPA/Hibernate, `RowMappers` en un paquete `mapper/` para queries de
20+ columnas, SQL centralizado en una clase `ConstantsQuery` (nunca hardcodeado inline), un
repositorio `AuditoriaXxxRepository` para trazabilidad de operaciones, y envolver
`DataAccessException` en una excepción de persistencia propia del dominio. No está confirmado
que esto aplique a todos los componentes Klap actuales — tratarlo como referencia de un
proyecto específico, no como estándar general, hasta que el equipo lo confirme o generalice.
