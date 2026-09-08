# Plan de integración — Klap Dev-Kit con la nueva Klap Knowledge

**Repositorio objetivo:** `alexis-apablaza-klap/klap-dev-kit`  
**Archivo sugerido:** `integracion-memoria-klap-dev-kit.md`  
**Fecha:** 2026-09-08

---

## 1. Objetivo

Adaptar `klap-dev-kit` para utilizar la nueva arquitectura de `klap-dev-kit-knowledge`:

- Git + YAML/NDJSON como memoria canónica.
- SQLite + FTS5 como read model local derivado.
- MCP como frontera.
- Claude dentro de Klap Dev-Kit como motor que:
  - lee Jira;
  - lee Confluence;
  - entiende cambios;
  - pregunta sólo lo necesario;
  - genera memoria inicial;
  - genera actualizaciones incrementales;
  - produce patches estructurados con evidencia.

Crear además un agente especializado **`documentador-klap`** para mantener la memoria global de producto.

No confundirlo con el agente actual **`documentador`**, cuya responsabilidad sigue siendo la documentación técnica del repositorio y, cuando corresponde, Confluence.

---

## 2. Arquitectura objetivo

```text
                       Developer
                           |
                           v
                    Claude Code
                           |
                    klap-dev-kit
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
          Jira MCP    Confluence MCP   Repo/Git
             |             |             |
             +-------------+-------------+
                           |
                           v
                  documentador-klap
                           |
                  interpreta / resume
                  relaciona / pregunta
                           |
                           v
                 memory patch JSON
                           |
                           v
               Klap Knowledge MCP
                           |
                           v
             Git YAML/NDJSON + SQLite
                           |
                           v
               memoria compartida
```

`klap-dev-kit` nunca debe conocer que internamente hay SQLite. Sólo debe conocer el contrato MCP.

---

## 3. Responsabilidades

### `documentador` existente

Mantener su rol:

- memoria técnica local del repositorio;
- `component.yaml`;
- `docs/context/index.yaml`;
- documentos técnicos locales;
- ADR;
- actualización Confluence cuando corresponde.

### `documentador-klap` nuevo

Responsable de la **memoria organizacional de producto**:

- descripción de negocio;
- objetivo;
- clientela objetivo;
- propuesta de valor/capabilities relevantes;
- importancia dentro del ecosistema;
- relaciones con otros productos;
- historial relevante Jira;
- documentación relevante Confluence;
- representación técnica del producto mediante componentes;
- procedencia/versiones;
- detección de staleness;
- generación de patches estructurados.

No edita código de aplicación.

No escribe directamente archivos internos de `klap-dev-kit-knowledge`.

Toda escritura se realiza a través del MCP de Knowledge.

---

## 4. Contrato MCP v2 — cambio coordinado

El contrato vive en:

```text
schemas/knowledge-mcp/tools.json
```

El cambio debe realizarse primero en `klap-dev-kit` según el protocolo ya definido.

Se recomienda versión:

```text
contractVersion: 2.0.0
```

porque cambia el modelo de escritura.

### Tools de lectura

Mantener:

- `buscar_producto`
- `resumen_producto`
- `resumen_componente`
- `buscar`
- `documentos_relevantes`

Agregar:

- `obtener_producto`
- `historial_producto`
- `estado_fuentes`

### Tool de escritura

Agregar:

```text
aplicar_patch_memoria
```

La tool recibe operaciones estructuradas ya generadas por Claude.

### Deprecación

`targeted_sync` deja de ser el mecanismo de actualización.

Motivo:

```text
antes:
targeted_sync -> Knowledge lee fuente -> LLM interno -> grafo

nuevo:
Claude lee fuente -> genera patch -> Knowledge valida/persiste
```

Actualizar:

- `schemas/knowledge-mcp/tools.json`
- `schemas/knowledge-mcp/README.md`
- mock MCP;
- tests del mock;
- tests de validación de contrato;
- `config/klap.yaml` `contratos.knowledge_mcp`.

---

## 5. Configuración de conexión

### Estado actual

`config/klap.yaml` apunta a:

```yaml
mcp:
  knowledge:
    server: klap-knowledge-local-mock
    modo: mock
```

### Objetivo

Cuando la implementación real pase los tests:

```yaml
mcp:
  knowledge:
    server: klap-knowledge
    modo: produccion
    fallback_si_no_disponible: true
```

No hardcodear paths del workspace dentro de skills o agentes.

Agregar configuración explícita para localizar el checkout local de Knowledge, por ejemplo mediante entorno/config de bootstrap:

```text
KLAP_KNOWLEDGE_PATH
```

El mecanismo concreto de registro MCP debe seguir el formato soportado por Claude Code en la versión vigente al implementar; verificar documentación oficial antes de modificar `.mcp.json`.

### Criterio

El developer debe poder:

1. instalar Klap Dev-Kit;
2. tener acceso al repositorio privado Knowledge;
3. tener checkout local o instalación equivalente;
4. arrancar el MCP real;
5. ejecutar `/klap:memoria-consultar ...`.

No requerir Neo4j, Docker ni keys de LLM.

---

## 6. Bootstrap

Extender `bootstrap/install.sh` y `bootstrap/install.ps1` para:

1. comprobar que el usuario tiene Python compatible con Knowledge;
2. localizar `klap-dev-kit-knowledge`;
3. validar que no sea un checkout público incorrecto;
4. instalar el paquete/venv si la estrategia final lo requiere;
5. ejecutar:
   - `klap-knowledge validate`;
   - `klap-knowledge rebuild`;
6. comprobar health/handshake MCP;
7. informar claramente si se usa mock o producción.

No clonar automáticamente un repositorio privado sin una decisión explícita de credenciales/autenticación corporativa.

Si Knowledge no está disponible:

- mantener `fallback_si_no_disponible: true`;
- el flujo normal continúa con Jira + memoria del repo;
- declarar contexto parcial.

---

## 7. Nuevo agente `agents/documentador-klap.md`

Crear:

```text
agents/documentador-klap.md
```

### Frontmatter orientativo

```yaml
---
name: documentador-klap
description: Mantiene la memoria global de productos Klap a partir de Jira, Confluence, repositorios y conocimiento existente, generando patches estructurados y trazables para Klap Knowledge.
model: sonnet
---
```

No fijar una versión de modelo fuera de las convenciones soportadas por Claude Code/Klap Dev-Kit.

---

## 8. Instrucciones del agente `documentador-klap`

### 8.1 Regla principal

El agente debe:

> Leer primero la memoria existente, luego las fuentes relevantes, formular sólo las preguntas que no pueda resolver de forma confiable y finalmente producir un patch estructurado.

Nunca debe inventar:

- nombres oficiales de productos;
- clientela;
- objetivos;
- componentes;
- relaciones entre productos;
- criticidad;
- fechas;
- ownership;
- fuentes.

---

## 9. Flujo para crear una memoria inicial

### Paso 1 — comprobar Knowledge

Llamar:

```text
buscar_producto
obtener_producto
```

Si el producto existe, no ejecutar inicialización como si fuera nuevo.

### Paso 2 — identificar fuentes

Obtener, desde información disponible o mediante preguntas:

- nombre canónico del producto;
- aliases conocidos;
- espacio(s) Confluence relevantes;
- épica(s) Jira raíz;
- proyecto Jira si es necesario para descubrir nuevas épicas;
- repos/componentes conocidos si existen.

### Paso 3 — hacer preguntas mínimas

El agente debe **consultar primero las fuentes disponibles**. No convertir el proceso en un cuestionario manual.

Preguntar sólo lo no resoluble o ambiguo.

Preguntas candidatas:

1. ¿Cuál es el nombre oficial/canónico del producto?
2. ¿Cuál es su objetivo de negocio si las fuentes son ambiguas?
3. ¿Cuál es la clientela/segmento objetivo si no aparece de forma consistente?
4. ¿Qué espacios de Confluence son autoritativos?
5. ¿Qué épicas/proyecto Jira representan su evolución?
6. ¿Existen productos relacionados que deban considerarse y cuál es la naturaleza de la relación?
7. ¿Hay componentes conocidos que las fuentes no logran mapear a `component_id` real?

No preguntar lo que Jira/Confluence ya responden de manera inequívoca.

### Paso 4 — leer Jira

Usar el MCP Atlassian configurado en `config/klap.yaml`.

Para cada épica:

- título;
- descripción;
- estado;
- fechas;
- issues hijos relevantes;
- links/dependencias cuando aporten contexto;
- actualización de cada issue;
- changelog sólo cuando sea necesario para entender evolución, no por defecto;
- comentarios sólo si contienen una decisión que no esté en descripción/documentación.

Construir eventos históricos relevantes.

No guardar todo el JSON de Jira.

### Paso 5 — leer Confluence

Para cada espacio:

1. obtener catálogo/metadata de páginas;
2. priorizar páginas por título/ubicación:
   - overview;
   - producto;
   - negocio;
   - arquitectura;
   - integraciones;
   - procesos;
   - decisiones;
3. leer páginas candidatas;
4. registrar:
   - ID;
   - título;
   - versión;
   - updated_at;
   - resumen;
   - temas;
5. no copiar cuerpos completos al Knowledge salvo requisito explícito.

### Paso 6 — descubrir representación técnica

Orden de autoridad:

1. `component.yaml` real;
2. repositorio/código;
3. documentación técnica;
4. Jira/Confluence;
5. inferencia sólo como candidato pendiente.

Nunca inventar un `component_id` a partir de texto.

### Paso 7 — relaciones con otros productos

Para cada relación propuesta:

- producto origen;
- producto destino;
- tipo;
- dirección;
- descripción;
- importancia/criticidad sólo si existe evidencia suficiente;
- fuentes.

Si una relación es inferida pero no confirmable, dejarla fuera del estado consolidado y formular una pregunta.

### Paso 8 — propuesta

Generar artefactos locales:

```text
.klap/knowledge/<product-id>/
├── discovery.md
├── questions.md
├── proposal.md
└── patch.json
```

Debe contener:

- hechos;
- fuentes;
- ambigüedades;
- preguntas resueltas;
- memoria propuesta;
- patch MCP a aplicar.

### Paso 9 — aprobación inicial

Para **creación inicial de producto**, exigir una pausa humana antes del primer patch.

Después de aprobar:

```text
aplicar_patch_memoria
```

---

## 10. Flujo de actualización incremental

La actualización normal no debe volver a escanear todo.

### Entrada

Puede venir de:

- cierre de una HU;
- `/klap:memoria-actualizar <producto>`;
- cambio explícito en Confluence;
- necesidad detectada durante un análisis.

### Algoritmo

1. `obtener_producto`.
2. `estado_fuentes`.
3. consultar Jira/Confluence.
4. comparar:
   - `updated_at`;
   - versión;
   - IDs;
   - cursores.
5. leer sólo fuentes nuevas/modificadas.
6. generar delta semántico.
7. generar patch.
8. aplicar automáticamente cambios de bajo riesgo.
9. preguntar sólo si existe conflicto/ambigüedad relevante.

### Bajo riesgo — puede autoaplicar

Ejemplos:

- nuevo evento Jira con fuente inequívoca;
- actualización de versión de documento;
- nuevo resumen de una página sin modificar la definición canónica;
- vínculo de componente ya respaldado por `component.yaml`;
- actualización de cursor/source state.

### Requiere confirmación

- cambiar objetivo principal del producto;
- cambiar clientela objetivo de forma contradictoria;
- renombrar/eliminar producto;
- declarar relación crítica entre productos con evidencia insuficiente;
- eliminar componente sin fuente clara;
- conflicto entre Confluence, Jira y código;
- sobrescribir una definición humana explícita no supersedida.

Esto minimiza mantenimiento humano sin permitir cambios de alto impacto silenciosos.

---

## 11. Nuevo skill `/klap:memoria-inicializar`

Crear:

```text
skills/memoria-inicializar/SKILL.md
```

Uso:

```text
/klap:memoria-inicializar <producto>
```

Responsabilidades:

1. resolver configuración;
2. invocar `documentador-klap`;
3. generar memoria inicial;
4. presentar preguntas necesarias;
5. presentar propuesta;
6. pausa humana;
7. aplicar patch;
8. reportar archivos/revisión generada por Knowledge.

No implementa lógica de negocio por sí mismo: orquesta al agente.

---

## 12. Nuevo skill `/klap:memoria-actualizar`

Crear:

```text
skills/memoria-actualizar/SKILL.md
```

Usos:

```text
/klap:memoria-actualizar abono-ya
/klap:memoria-actualizar SVA-1925
```

Si recibe issue Jira:

1. identificar producto;
2. leer Knowledge;
3. actualizar sólo fuentes afectadas;
4. producir patch.

Si recibe producto:

1. revisar `estado_fuentes`;
2. identificar deltas Jira/Confluence;
3. actualizar incrementalmente.

Por defecto no requiere pausa para cambios de bajo riesgo.

---

## 13. Nuevo skill `/klap:memoria-consultar`

Crear:

```text
skills/memoria-consultar/SKILL.md
```

Uso:

```text
/klap:memoria-consultar abono-ya
/klap:memoria-consultar "qué productos usan ms-central-sva"
/klap:memoria-consultar "qué cambió en Abono Ya durante los últimos tres meses"
/klap:memoria-consultar "qué productos dependen de Liquidaciones"
```

Flujo:

1. detectar si es búsqueda de producto, estructurada, histórica o documental;
2. usar tools de Knowledge;
3. responder usando memoria consolidada;
4. si Knowledge declara staleness o falta de información:
   - expandir con Jira/Confluence sólo si hace falta;
   - diferenciar lo recuperado de Knowledge de lo leído en vivo.

No escribir memoria desde un comando de consulta, salvo que el usuario pida explícitamente actualizarla.

---

## 14. Integración con `/klap:trabajar-hu`

El flujo actual tiene:

1. Contexto
2. Análisis
3. Diseño
4. Implementación
5. Validación
6. Certificación
7. Documentación
8. Finalización

Mantener esa estructura.

### Fase 1

El agente `analista` debe continuar usando Knowledge antes de profundizar en Confluence.

Con el contrato v2 puede obtener:

- vista negocio;
- relaciones;
- componentes;
- historial reciente;
- documentos relevantes.

### Fase 7

El agente `documentador` sigue actualizando:

- memoria técnica local;
- documentación del repo;
- Confluence si corresponde.

Eliminar de sus instrucciones la dependencia conceptual de `targeted_sync`.

### Fase 8

Agregar paso:

```text
documentador-klap
```

Input compacto:

- ISSUE-KEY;
- contexto/producto;
- `analisis.md`;
- `diseno.md`;
- diff final resumido;
- componentes afectados;
- documentos Confluence modificados;
- resultado del `documentador`.

El agente debe producir sólo el delta de memoria global.

### Orden final

```text
repo memory
    |
Confluence (si cambió)
    |
documentador-klap lee estado final
    |
aplicar_patch_memoria
    |
resumen HU
```

Así Knowledge se actualiza con la realidad final del desarrollo, no con una hipótesis previa.

---

## 15. Cambios al agente `analista`

Mantener la filosofía actual de progressive disclosure.

Actualizar la secuencia:

1. Jira de la HU.
2. `buscar_producto`.
3. `obtener_producto` o `resumen_producto`.
4. `historial_producto` sólo si la HU necesita contexto histórico.
5. memoria técnica local del repo.
6. `documentos_relevantes`.
7. Confluence sólo si:
   - Knowledge no basta;
   - está stale;
   - existe conflicto;
   - se necesita evidencia primaria.

No cargar timelines completos por defecto.

---

## 16. Cambio al agente `documentador`

Actualizar `agents/documentador.md`.

Eliminar la regla actual:

```text
después de tocar Confluence -> targeted_sync
```

Reemplazarla por:

```text
después de finalizar documentación -> entregar al documentador-klap
las fuentes realmente modificadas y el contexto compacto
```

`documentador` no debe mantener la memoria global directamente.

---

## 17. Scripts

### Retirar/deprecar

- `scripts/targeted-sync.mjs`

cuando el contrato v2 esté activo.

### Agregar

#### `scripts/knowledge-health.mjs`

- valida configuración;
- valida que el MCP responda;
- valida contract version;
- reporta modo mock/producción.

#### `scripts/knowledge-contract-test.mjs`

Si la validación actual ya cubre lo mismo, extender en vez de duplicar.

#### `scripts/knowledge-bootstrap.mjs`

Sólo si es necesario para el launcher local:

- localiza Knowledge;
- ejecuta validate/rebuild;
- no almacena credenciales;
- no hace git push.

No duplicar dentro de JS lógica que pertenezca al servicio Python.

---

## 18. Artefactos locales del Dev-Kit

Mantener artefactos de trabajo fuera de la memoria compartida:

```text
.klap/knowledge/<product-id>/
├── discovery.md
├── questions.md
├── proposal.md
└── patch.json
```

Deben estar gitignored junto a otros artefactos `.klap`.

Sirven para:

- inspección;
- recuperación;
- debugging;
- revisión humana.

No son la fuente de verdad compartida.

---

## 19. Evals del agente `documentador-klap`

Agregar evaluaciones explícitas.

### Eval 1 — no inventa negocio

Si Confluence/Jira no indican cliente objetivo, debe preguntar o dejar pendiente.

### Eval 2 — no inventa componentes

Una mención textual a "servicio conciliador" no puede transformarse automáticamente en `ms-conciliador`.

### Eval 3 — usa Knowledge primero

Para producto existente, no comienza escaneando Confluence completo.

### Eval 4 — delta

Si sólo cambió una página Confluence, no relee todo el espacio.

### Eval 5 — historial idempotente

Procesar dos veces la misma HU no crea dos eventos.

### Eval 6 — conflicto

Si Jira y Confluence contradicen el objetivo del producto, no sobrescribe silenciosamente.

### Eval 7 — procedencia

Cada cambio derivado de IA incluye fuente verificable.

### Eval 8 — actualizaciones rutinarias

Un nuevo issue cerrado puede generar un evento sin requerir pregunta humana si producto y fuente son inequívocos.

### Eval 9 — producto inicial

No aplica primera memoria sin pausa humana.

---

## 20. Tests de integración

### Mock

Actualizar el mock de Knowledge al contrato v2.

Probar:

- lectura de producto;
- historial;
- estado de fuentes;
- patch válido;
- patch inválido;
- conflicto de revisión.

### Dev-Kit

Agregar tests para:

- config v2;
- ausencia del MCP;
- fallback;
- skills registradas;
- agente disponible;
- `/klap:trabajar-hu` invoca `documentador-klap` sólo después de documentación/certificación;
- no usa `targeted_sync`;
- no carga Confluence sin necesidad.

### Cross-repo

Mantener un test de contrato que pueda ejecutarse contra:

1. mock;
2. `klap-dev-kit-knowledge` real.

Un mismatch de `contractVersion` debe bloquear el switch a producción.

---

## 21. Documentación para desarrolladores

Actualizar:

- `README.md`
- `guia-usuario.md`
- `docs/getting-started.md`
- `docs/installation.md`
- `docs/workflows.md`
- `docs/architecture-overview.md`
- `CLAUDE.md` si cambia alguna regla de progressive disclosure.

Documentar sólo lo que el developer necesita saber:

```text
/klap:memoria-consultar ...
/klap:memoria-inicializar ...
/klap:memoria-actualizar ...
```

El developer no necesita conocer SQLite.

---

## 22. Consulta directa fuera de Klap Dev-Kit

La consulta directa la proporciona `klap-dev-kit-knowledge`:

```bash
klap-knowledge product abono-ya
klap-knowledge search "..."
klap-knowledge history abono-ya
```

`klap-dev-kit` debe enlazar esa documentación, no duplicar la CLI.

---

## 23. Política de actualización automática

### Objetivo

Que la memoria sea mantenida mayoritariamente por IA, no por humanos.

### Regla

```text
fuente inequívoca + cambio de bajo riesgo
=> autoaplicar

ambigüedad/conflicto/cambio canónico de alto impacto
=> preguntar
```

No exigir aprobación humana para cada evento Jira: eso recrearía el problema de mantenimiento manual.

### Auditoría

La revisión humana sigue disponible mediante Git:

- diff;
- commit;
- PR;
- blame;
- revert.

---

## 24. Workflow Git recomendado para Knowledge

Para costo cero y memoria compartida:

```text
Git remoto privado
        |
        +---- developer A clone
        |          |
        |          +-- SQLite local
        |          +-- MCP local
        |
        +---- developer B clone
                   |
                   +-- SQLite local
                   +-- MCP local
```

La DB no se comparte.

Se comparte sólo la memoria canónica.

### Escritura

Para la primera etapa:

1. `documentador-klap` aplica patch al checkout local.
2. Klap Dev-Kit muestra archivos modificados.
3. cambios van en la rama de la HU o en una rama de memoria definida por el equipo.
4. commit/push/PR mediante workflow Git normal.

No implementar un servicio de escritura central.

---

## 25. Plan de implementación por fases

### Fase A — contrato

- [ ] Diseñar `tools.json` v2.
- [ ] Actualizar README de contrato.
- [ ] Actualizar mock.
- [ ] Tests.
- [ ] `config/klap.yaml` sigue en mock.

### Fase B — agente

- [ ] Crear `agents/documentador-klap.md`.
- [ ] Definir reglas Jira.
- [ ] Definir reglas Confluence.
- [ ] Definir preguntas mínimas.
- [ ] Definir autoapply vs confirmación.
- [ ] Evals.

### Fase C — skills

- [ ] `memoria-inicializar`.
- [ ] `memoria-actualizar`.
- [ ] `memoria-consultar`.

### Fase D — integración workflow HU

- [ ] actualizar `documentador`.
- [ ] actualizar `trabajar-hu`.
- [ ] actualizar `references/fases.md`.
- [ ] actualizar `analista`.
- [ ] eliminar uso de `targeted_sync`.

### Fase E — conexión real

Cuando Knowledge implemente v2:

- [ ] health check.
- [ ] contract test cruzado.
- [ ] bootstrap.
- [ ] registrar MCP real.
- [ ] `modo: produccion`.
- [ ] fallback probado.

### Fase F — piloto

Inicializar 2–3 productos.

Evaluar:

- preguntas hechas al humano;
- calidad de negocio;
- precisión de relaciones;
- precisión de componentes;
- delta Jira;
- delta Confluence;
- utilidad durante análisis HU;
- tiempo/costo de interacción Claude;
- conflictos Git.

---

## 26. Criterios de aceptación

La integración se considera terminada cuando:

1. `/klap:memoria-consultar` funciona contra Knowledge real.
2. `/klap:memoria-inicializar` puede construir una memoria desde Jira + Confluence + repos y hacer sólo preguntas necesarias.
3. `/klap:memoria-actualizar` procesa deltas.
4. `documentador-klap` no usa otro LLM/API.
5. Knowledge no necesita Gemini/OpenAI/Anthropic API.
6. `/klap:trabajar-hu` actualiza memoria global al cierre.
7. Cambios rutinarios pueden autoaplicarse.
8. Cambios canónicos/conflictivos requieren confirmación.
9. Todos los facts derivados mantienen procedencia.
10. componentes no se inventan.
11. `targeted_sync` ya no forma parte del workflow activo.
12. el MCP puede caer y el workflow degrada a Jira + memoria local.
13. contrato mock/real v2 es idéntico.
14. el developer no necesita conocer SQLite ni editar memoria manualmente.

---

## 27. Principios para Claude implementador

1. **No duplicar conocimiento.** Knowledge resume y referencia; Jira/Confluence siguen siendo fuentes originales.
2. **No releer todo.** Utilizar cursores/versiones/updated_at.
3. **No inventar.** Preguntar ante gaps importantes.
4. **No preguntar por defecto.** Primero intentar resolver desde fuentes.
5. **No mezclar roles.** `documentador` = repo; `documentador-klap` = producto global.
6. **No dar poder de escritura libre al LLM.** Sólo patches estructurados.
7. **No introducir otra API de IA.** Claude ejecuta dentro del flujo del Dev-Kit.
8. **No convertir Knowledge en dependencia dura.** Mantener fallback.
9. **No ocultar conflictos.** Exponerlos y pedir decisión.
10. **No sobrearquitectar.** Git + SQLite debe demostrar insuficiencia antes de introducir infraestructura adicional.
