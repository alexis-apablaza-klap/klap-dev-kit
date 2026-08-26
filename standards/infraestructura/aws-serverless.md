---
titulo: "AWS Serverless — esqueleto pendiente de contenido"
obligatoriedad: CONTEXT_DEPENDENT
estado: requiere-revision
origen: "eco-team-brain (sin contenido específico de AWS encontrado)"
revisado_por: null
revisado_en: null
tags: [aws, lambda, serverless]
---

> **Esqueleto mínimo.** No se encontró contenido específico de prácticas AWS/Lambda en
> `eco-team-brain` al momento de crear este documento — no se inventó contenido para llenar
> este vacío. `config/klap.yaml` confirma que AWS Lambda es parte del stack soportado
> (`stack_soportado.infraestructura.aws_lambda`), pero las prácticas concretas (cold start,
> memoria, timeouts, patrones de despliegue, IAM) quedan pendientes de que el equipo las
> documente.

# AWS Serverless en Klap — pendiente

Temas que este documento debería cubrir una vez que el equipo aporte el contenido:

- Runtime y versión de Java soportada en Lambda (coherente con `config/klap.yaml`).
- Gestión de cold start para componentes con requisitos de latencia.
- Cómo se resuelven secretos en Lambda (Secrets Manager, ver `standards/seguridad`) —
  presumiblemente igual que en Spring Boot tradicional, a confirmar.
- Patrón de despliegue (SAM, CDK, Terraform u otro) — no asumido aquí.
- Observabilidad específica de Lambda (CloudWatch, X-Ray) — relación con
  `standards/observabilidad/logging-metricas-trazas.md`.

Hasta que se complete, el `arquitecto` debe tratar cualquier decisión de diseño sobre AWS
Lambda como `CONTEXT_DEPENDENT` sin un estándar Klap que la respalde, y señalarlo como
pregunta pendiente si es relevante para la HU.

Distinción importante: para prácticas **genéricas** de AWS Lambda con Java (cold start,
SnapStart, tuning de memoria/timeout) el `arquitecto` puede consultar Context7
(`config/klap.yaml` → `mcp.context7.server`) o la documentación oficial de AWS como
conocimiento general — eso no requiere que el equipo lo decida primero. Lo que sigue
genuinamente pendiente de equipo son las decisiones **propias de Klap** (qué herramienta de
despliegue, convención de IAM, naming de funciones) — eso Context7 no lo puede resolver por
tratarse de una decisión interna, no de comportamiento del framework/servicio.
