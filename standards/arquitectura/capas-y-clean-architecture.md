---
titulo: "Arquitectura por capas, Clean Architecture y SOLID en microservicios Spring Boot"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [arquitectura, clean-architecture, solid, ddd, spring-boot]
---

# Arquitectura por capas y Clean Architecture

## Estructura de paquetes recomendada (MANDATORY la dirección de dependencias, RECOMMENDED los nombres exactos)

```
com.klap.<producto>.<componente>/
├── api/            # controllers REST, mappers de entrada/salida — adaptador primario
├── application/    # casos de uso / servicios de aplicación — orquesta, no contiene reglas de negocio complejas
├── domain/         # entidades, value objects, reglas de negocio — sin dependencias de Spring
├── infrastructure/
│   ├── persistence/    # repositorios JDBC/JPA, mappers de fila — adaptador secundario
│   ├── messaging/       # listeners/producers Kafka — adaptador secundario
│   └── client/           # WebClient hacia otros componentes — adaptador secundario
└── config/         # @Configuration, beans, wiring
```

## Dirección de dependencias (MANDATORY)

`api` y `infrastructure` dependen de `domain` y `application` — nunca al revés. `domain` no
importa nada de Spring, JDBC ni Kafka. Si una regla de negocio necesita algo externo, se
expresa como una interfaz en `domain`/`application` (puerto) y se implementa en
`infrastructure` (adaptador). Esto es lo que permite testear el dominio sin levantar contexto
Spring.

**Mal**: una clase en `domain` que hace `@Autowired JdbcTemplate`.
**Bien**: `domain` define `interface CalculoAnticipoRepository`, `infrastructure.persistence`
la implementa con `JdbcTemplate`.

## SOLID aplicado, no como lista abstracta

- **S**: un servicio de aplicación resuelve un caso de uso, no varios. Si un método tiene "y"
  en su nombre (`calcularYNotificar`), probablemente son dos casos de uso.
- **O**: nueva regla de negocio → nueva implementación de una interfaz existente, no un
  `if/else` creciente en la implementación actual.
- **L**: una implementación alternativa de un puerto debe poder reemplazar a la actual sin que
  el caso de uso lo note — si necesita que el caller sepa cuál implementación es, el puerto
  está mal diseñado.
- **I**: interfaces pequeñas y específicas del consumidor (`CalculoAnticipoRepository`, no un
  `RepositorioGenerico<T>` con 20 métodos donde cada implementación usa 3).
- **D**: casos de uso dependen de interfaces (`domain`/`application`), nunca de clases
  concretas de `infrastructure`.

## DDD — cuándo aplica (CONTEXT_DEPENDENT)

No es el default para todo componente. Aplica cuando el dominio tiene reglas de negocio
sustanciales que se benefician de encapsularse:

- **Entidad**: tiene identidad estable a través del tiempo (`Anticipo` con su `id`).
- **Value Object**: se compara por valor, inmutable (`Monto`, `PeriodoLiquidacion`).
- **Agregado**: raíz que garantiza invariantes de un conjunto de entidades/VOs relacionados —
  las modificaciones pasan siempre por la raíz.
- **Bounded Context**: un componente puede pertenecer a más de un producto (ver
  `component.yaml`), pero su dominio interno debe tener un límite claro — no compartir
  entidades de dominio entre componentes; compartir contratos (DTOs de API/eventos) sí.

Si el componente es esencialmente CRUD con poca lógica, forzar agregados/value objects agrega
complejidad sin beneficio — usar la estructura de capas simple es suficiente. Ver
`standards/arquitectura/ddd-avanzado.md` para profundizar cuando el dominio lo justifique.

## Compatibilidad con lo existente

Antes de aplicar esta estructura a un componente ya existente con una organización distinta,
prioriza consistencia con lo que ya hay (ver `agents/arquitecto.md`) — no migres la estructura
de paquetes completa como efecto secundario de una HU no relacionada.
