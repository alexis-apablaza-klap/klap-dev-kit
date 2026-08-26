---
titulo: "Clean Code — reglas concretas, no generalidades"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [clean-code, solid, desarrollo]
---

# Clean Code en la práctica

SOLID aplicado a arquitectura vive en `standards/arquitectura/capas-y-clean-architecture.md`.
Esto es a nivel de método y clase.

## Naming (MANDATORY)

**Mal**: `procesar(Object o, int t)`
**Bien**: `calcularMontoAnticipo(VentaDiaria venta, TipoLiquidacion tipoLiquidacion)`

El nombre debe permitir entender qué hace sin leer el cuerpo. Si necesitas un comentario para
explicar qué hace un método, el nombre está mal elegido — usa el comentario sólo para el *por
qué*, nunca el *qué* (esto aplica también al código que Claude genera, no sólo a humanos).

## Tamaño de método y clase (RECOMMENDED, con criterio)

Un método que no cabe en una pantalla sin scroll suele estar haciendo más de una cosa.
No es una regla de líneas exacta — es una señal: si para explicar el método usarías "primero
X, luego Y, y si Z entonces W", probablemente son 2-3 métodos con nombres propios.

## Manejo de errores explícito (MANDATORY)

**Mal**:
```java
try {
    return repository.buscar(id);
} catch (Exception e) {
    return null;
}
```
Esto oculta la causa real y traslada el problema al caller, que ahora debe adivinar por qué
recibió `null`.

**Bien**:
```java
try {
    return repository.buscar(id);
} catch (DataAccessException e) {
    throw new AnticipoPersistenceException("Error al buscar anticipo " + id, e);
}
```
Captura el tipo específico que puede ocurrir, no `Exception` genérico. Propaga con contexto,
no silencia.

Nunca interpolar un PAN completo en el mensaje de una excepción o log — si es necesario
referenciarlo, usar sólo los últimos 4 dígitos (ver `standards/seguridad/owasp-y-secretos.md`).
El resto de los datos de dominio (ids, montos, etc.) se asume ya tratado antes de llegar a
este punto — este documento no exige masking general de PII.

## Evitar null cuando se puede (RECOMMENDED)

Preferir `Optional<T>` en retornos donde la ausencia es un caso válido y esperado; reservar
`null` para lo que realmente nunca debería pasar (y ahí, fallar rápido con una excepción, no
propagar el `null`). `Optional` es sólo para tipos de retorno — nunca como parámetro de método
ni como campo de una clase: ahí no evita el null-check (el caller igual debe desenvolverlo) y
además no es `Serializable`.

## Inmutabilidad (RECOMMENDED)

DTOs y Value Objects como `record` (Java 21) o clases con campos `final` — evita mutación
compartida entre capas y hace el objeto seguro de pasar entre threads (relevante con virtual
threads).

## Inyección de dependencias: constructor, nunca field injection ni `new()` (MANDATORY)

**Mal** (el antipatrón real más común, no `new()`):
```java
@Autowired
private AnticipoCalculadora calculadora;
```
**Bien**:
```java
private final AnticipoCalculadora calculadora;

public ServicioAnticipo(AnticipoCalculadora calculadora) {
    this.calculadora = calculadora;
}
```
Field injection es más frecuente en código real que `new AnticipoCalculadora()` a mano, y el
daño es mayor: impide `final`, oculta dependencias circulares hasta runtime, y sigue rompiendo
testabilidad igual que `new()` directo. Constructor injection con campos `final` es la única
forma aceptada.

## Alcance del cambio

No refactorices código no relacionado con la tarea actual sólo porque lo viste de paso. Un
cambio acotado es más fácil de revisar y de certificar que uno que mezcla la HU con limpieza
general — ver `agents/desarrollador.md`.
