---
titulo: "Estrategia de testing y coverage"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [testing, tdd, coverage, jacoco]
---

# Estrategia de testing

## Pirámide

- **Unit**: mayoría de las pruebas. Dominio y casos de uso sin contexto Spring, mockeando
  puertos (interfaces). Rápidas, sin I/O real.
- **Integration**: contra la implementación real de un adaptador (repositorio JDBC contra un
  Postgres de test, listener Kafka contra un broker embebido/testcontainer) — menos que unit,
  más lentas, verifican el borde real con el sistema externo.
- **Functional**: el flujo completo expuesto por la API del componente, de punta a punta
  dentro del proceso.
- **Regression**: casos que reproducen un bug ya corregido, para que no vuelva a aparecer en
  silencio.

## Cuándo usar TDD (RECOMMENDED)

Especialmente valioso cuando la regla de negocio es el riesgo principal (cálculos financieros,
lógica de liquidación) — escribir el test primero fuerza a definir el comportamiento esperado
antes de implementarlo. Para trabajo mecánico (DTOs, mappers triviales) TDD aporta menos y no
es obligatorio.

## Coverage — JaCoCo

El umbral vigente vive en `config/quality-gates.yaml` (`coverage.minimo_porcentaje`) —
consúltalo ahí, no lo repitas de memoria. `scripts/quality-gate.mjs` es quien decide si el
número reportado pasa o no; ningún agente debe aprobar/rechazar por su cuenta.

## No optimizar cobertura ciegamente (MANDATORY el principio; hoy se apoya en juicio del `certificador`, no en script)

Una prueba que ejecuta código sin verificar comportamiento infla el número sin dar seguridad
real. Ejemplos de pruebas débiles a evitar:

**Mal** — ejecuta pero no verifica nada útil:
```java
@Test
void testCalcular() {
    calculadora.calcular(venta); // no hay assert — sólo "no explota"
}
```

**Mal** — assert trivial que siempre pasa:
```java
assertNotNull(resultado); // no valida que el VALOR sea el correcto
```

**Bien**:
```java
@Test
void calcularMontoAnticipo_ventaConDescuento_aplicaPorcentajeCorrecto() {
    var venta = new VentaDiaria(Monto.of(100_000), TipoComercio.RETAIL);
    var resultado = calculadora.calcular(venta);
    assertThat(resultado.monto()).isEqualByComparingTo(Monto.of(95_000));
}
```

Si el `certificador` detecta coverage alto pero pruebas de este tipo débil, debe reportarlo
como hallazgo de calidad separado del veredicto numérico del gate — ver `agents/certificador.md`.

## Mutation testing — `config/quality-gates.yaml` → `mutacion.minimo_score`

Detecta el mismo problema ("coverage alto, pruebas débiles") de forma determinista: muta el
código de producción y verifica si algún test lo captura. El gate ya existe en
`scripts/quality-gate.mjs` (bloquea si `mutation_score` reportado < `mutacion.minimo_score`) y
sólo se evalúa cuando el repo efectivamente corre PITest (Java) o Stryker (TS) — un repo que
todavía no lo tiene configurado no se bloquea por su ausencia.

REQUIERE-USUARIO: `mutacion.minimo_score` en `config/quality-gates.yaml` es un placeholder
(60%) sin calibrar contra un repo real — el equipo debe correr la herramienta contra un
componente Klap real y ajustar el número antes de tratarlo como umbral definitivo.

## Tipos esperados en CI

`config/quality-gates.yaml` → `tests.tipos_esperados`. Un componente sin integration tests
donde hay adaptadores reales (BD, Kafka) está incompleto aunque el coverage unit sea alto.
