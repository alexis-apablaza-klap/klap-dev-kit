---
titulo: "Convenciones heredadas de naming, JavaDoc y Lombok (BYSF)"
obligatoriedad: RECOMMENDED
estado: requiere-revision
origen: eco-team-brain/scripts/windows/vault/Reglas DO.md, Reglas DONT.md, Convenciones Naming.md
revisado_por: null
revisado_en: null
tags: [naming, javadoc, lombok, convenciones, legacy]
---

# Convenciones heredadas de naming, JavaDoc y Lombok

> **Heredado sin validar.** Condensado desde el nodo "Standard KLAP BYSF" de `eco-team-brain`
> (equipo/squad BYSF). No está confirmado si esto es un estándar transversal de Klap o una
> convención específica de ese squad — decisión pendiente del equipo. Mientras no se revise,
> trátalo como referencia, no como regla `MANDATORY`.

## Naming

- Interfaces de servicio: `XxxService`, `XxxProcessor`, `XxxRepository`.
- Implementaciones: `XxxServiceImpl`, `XxxProcessorImpl` (`@Service`).
- Configuración: `XxxConfig`, `XxxKafkaConfig`, `XxxClientConfig` (`@Configuration`).
- Listeners Kafka: `XxxKafkaListener` (`@Component`).
- DTOs: `XxxInputDto`, `XxxOutputDto`, `XxxRequestDto`, `XxxResponseDto`.
- Excepciones: `XxxException`, `XxxClientException`, `XxxPersistenceException`.
- Métodos: `procesarXxx()`/`consultarXxx()`/`registrarXxx()` en servicios;
  `findById()`/`findAll()`/`insert()`/`update()` en repositorios;
  `consumir()`/`enviarMensaje()` en componentes Kafka.

## JavaDoc

Regla original: JavaDoc **obligatorio** en todo método público, explicando objetivo o
funcionamiento. Marcado `RECOMMENDED` aquí (no `MANDATORY`) hasta que el equipo confirme si
sigue vigente como política transversal — contradice la guía general de "no escribir
comentarios que no aporten un porqué no obvio" de `standards/desarrollo/clean-code-solid.md`
si se aplica sin criterio. Requiere decisión explícita de reconciliación.

## Lombok y capa de datos

- Lombok: `@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j` como base habitual.
- Persistencia: `JdbcTemplate` puro — **no** JPA/Hibernate — según esta convención heredada.
  Contrasta con `standards/datos/postgresql.md`, que no asume una tecnología de acceso a
  datos específica; si el equipo confirma JDBC puro como estándar Klap, debe moverse allí
  como regla `MANDATORY` en vez de quedar sólo aquí.
- Service layer: siempre definir interface antes de la implementación; no hacer bypass del
  service layer.

## Por confirmar antes de subir a `MANDATORY` o mover a otro documento

- ¿Aplica a todo Klap o sólo al squad BYSF?
- ¿JavaDoc obligatorio sigue siendo política vigente?
- ¿JDBC puro (sin JPA) es decisión de arquitectura transversal o específica de ese conjunto
  de servicios?
