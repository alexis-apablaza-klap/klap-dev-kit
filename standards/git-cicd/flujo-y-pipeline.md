---
titulo: "Git, PRs y pipeline de CI"
obligatoriedad: MANDATORY
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [git, ci-cd, pipeline]
---

# Git y CI/CD

## Branches y commits (RECOMMENDED el formato exacto, MANDATORY el principio)

Nombre de rama con el issue de Jira cuando el cambio corresponde a una HU
(`feature/KLAP-123-descripcion-corta`) — es lo que
`hooks/pre-push-quality-gate.mjs` usa para localizar la certificación de esa HU antes de
permitir el push. Commits con mensaje que explica el *por qué*, no una descripción literal del
diff.

## PR review (MANDATORY)

Todo cambio a una rama compartida pasa por PR. Un cambio de una HU no se considera cerrado
hasta que el PR está aprobado y la certificación (fase 6 de `/klap:trabajar-hu`) está en verde
— el hook de push bloquea antes, pero el review humano sigue siendo necesario para lo que un
gate automático no puede evaluar (calidad del diseño, alcance correcto).

## Gates de CI

La lógica de cada gate vive en `scripts/*.mjs` de este kit, no en el YAML del pipeline:

| Gate | Script | Umbral |
|---|---|---|
| Tests | `scripts/ejecutar-tests.mjs` | `config/quality-gates.yaml` → `tests` |
| Coverage + Sonar + Mutación | `scripts/quality-gate.mjs` | `config/quality-gates.yaml` → `coverage`/`sonarqube`/`mutacion` |
| Dependencias | `scripts/deps-scan.mjs` | `config/quality-gates.yaml` → `dependencias` |
| Kafka (config estática, sólo si el componente tiene `*KafkaConfig.java`) | `scripts/auditar-kafka.mjs` | `config/quality-gates.yaml` → `kafka` |
| Secretos | `scripts/escanear-secretos.mjs` | `config/quality-gates.yaml` → `secretos` (bloquea siempre) |
| Coherencia del propio kit | `scripts/validar-plugin.mjs` | — (sólo aplica a este repo) |

## Portabilidad (MANDATORY el diseño, informativo el estado actual)

`config/klap.yaml` → `hosting` indica GitHub como proveedor actual, con migración a Bitbucket
planificada. Como toda la lógica de gate vive en scripts Node y no en sintaxis específica de
GitHub Actions, el archivo de pipeline (`.github/workflows/ci.yml`) es un envoltorio delgado
que sólo invoca esos scripts — migrar de proveedor de CI no debería requerir reescribir la
lógica de validación, sólo el YAML que la invoca.

## Nunca

- Saltar hooks (`--no-verify`) para evitar un gate — si el gate está mal calibrado, se ajusta
  el umbral en `config/quality-gates.yaml` con acuerdo del equipo, no se lo evade caso a caso.
- Forzar push a una rama compartida sin autorización explícita del equipo.
