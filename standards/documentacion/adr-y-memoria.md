---
titulo: "Documentación — ADRs y memoria del componente"
obligatoriedad: RECOMMENDED
estado: vigente
origen: null
revisado_por: null
revisado_en: null
tags: [documentacion, adr, memoria]
---

# ADRs y memoria del componente

## Cuándo escribir un ADR (RECOMMENDED)

Cuando una decisión de arquitectura tiene alternativas reales que se descartaron y el motivo
no es obvio desde el código — cambio de estrategia de persistencia, elección entre síncrono y
asíncrono para una integración, introducción de un patrón nuevo. No es necesario un ADR para
decisiones que ya se derivan directamente de un estándar Klap existente (eso ya está
documentado en `standards/`, no hace falta repetirlo por componente).

Plantilla: `templates/adr.md`. No la dupliques aquí — este documento explica el *cuándo*, la
plantilla resuelve el *cómo*.

Un cuarto disparador, distinto a los anteriores: cuando una decisión ya registrada en un ADR
previo cambia. En ese caso nunca se edita el ADR histórico — se escribe uno nuevo que lo
reemplaza explícitamente (referenciándolo por número), preservando el registro de por qué se
decidió cada cosa en su momento. Ver el ejemplo `adr-014`/`diseno-legacy-batch` en
`templates/context-index.yaml`.

## Memoria del repo vs documentación de producto

- **`component.yaml` + `docs/context/`** (en el repo, versionado por Git): memoria técnica del
  componente — arquitectura, integraciones, decisiones, deployment, historial. Es lo que
  `/klap:actualizar-componente` mantiene y lo que el `analista` lee primero.
- **Confluence**: conocimiento a nivel de producto o cross-componente que no pertenece a un
  repo específico (definiciones de negocio, procesos, decisiones que afectan a varios
  componentes).

## Orden de actualización (MANDATORY el orden, ver `agents/documentador.md` para el detalle)

Primero la memoria del repo (revisable por PR), después Confluence sólo si hay conocimiento a
nivel producto, y sólo entonces `targeted_sync` hacia Klap Knowledge. Nunca al revés — escribir
a Confluence sin que el repo refleje el cambio deja la memoria versionada desactualizada, que
es la fuente que el siguiente desarrollador leerá primero.
