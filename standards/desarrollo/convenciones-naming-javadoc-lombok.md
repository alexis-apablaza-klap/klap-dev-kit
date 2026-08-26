---
titulo: "Convenciones de naming, JavaDoc y Lombok"
obligatoriedad: RECOMMENDED
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [naming, javadoc, lombok, convenciones]
---

# Convenciones de naming, JavaDoc y Lombok

## Naming (RECOMMENDED)

- Interfaces de servicio: `XxxService`, `XxxProcessor`, `XxxRepository`.
- Implementaciones: `XxxServiceImpl`, `XxxProcessorImpl` (`@Service`).
- Configuración: `XxxConfig`, `XxxKafkaConfig`, `XxxClientConfig` (`@Configuration`).
- Listeners Kafka: `XxxKafkaListener` (`@Component`).
- DTOs: `XxxInputDto`, `XxxOutputDto`, `XxxRequestDto`, `XxxResponseDto`.
- Excepciones: `XxxException`, `XxxClientException`, `XxxPersistenceException`.
- Métodos: `procesarXxx()`/`consultarXxx()`/`registrarXxx()` en servicios;
  `findById()`/`findAll()`/`insert()`/`update()` en repositorios;
  `consumir()`/`enviarMensaje()` en componentes Kafka.

## JavaDoc en la API pública (MANDATORY)

JavaDoc obligatorio en clases/métodos públicos que forman parte del contrato del componente
(services expuestos, controllers, clases de librería interna reutilizada por otros
componentes) — necesario para la autogeneración de documentación de referencia. Esto **no
contradice** `standards/desarrollo/clean-code-solid.md`: ese standard rige comentarios *dentro*
del cuerpo del método (evitar explicar el "qué" cuando el nombre ya lo dice); el JavaDoc de la
API pública documenta el **contrato** (`@param`, `@return`, `@throws`) para quien consume la
clase desde afuera, no repite en prosa lo que el nombre del método ya expresa. No es
`MANDATORY` para métodos privados/de implementación interna — ahí sigue rigiendo el criterio de
"comentario sólo si el nombre no basta".

## Lombok (RECOMMENDED)

- `@RequiredArgsConstructor` + `@Slf4j`: base habitual — el primero es precisamente cómo se
  implementa sin boilerplate la inyección por constructor con campos `final` que
  `standards/desarrollo/clean-code-solid.md` exige.
- `@Data` **no se recomienda** en DTOs/Value Objects: genera setters, lo que contradice la
  preferencia de inmutabilidad (`record`/campos `final`) del mismo standard. Usar `@Value` (o
  `record` directamente en Java 21) para inmutabilidad con Lombok si aplica.
- `@Builder` es aceptable donde la construcción tiene múltiples campos opcionales.
