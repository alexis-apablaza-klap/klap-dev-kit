---
name: disenar
description: "Ejecuta la fase de Diseño a partir de un análisis existente (analisis.md o descripción del cambio), sin implementar. Uso: /klap:disenar [ruta-a-analisis.md]"
---

# /klap:disenar

Invoca al agente `arquitecto` (ver `agents/arquitecto.md`) sobre un análisis ya disponible:
un `analisis.md` generado por `/klap:analizar` o `/klap:trabajar-hu`, o una descripción del
cambio si no existe análisis formal (dilo explícitamente en la salida).

Prioriza consistencia con la arquitectura y patrones existentes del componente sobre
introducir tecnología nueva. Consulta `standards/index.yaml` sólo por las entradas relevantes
al cambio — no cargues el árbol completo de estándares.

Salida: `diseno.md` con la propuesta recomendada, impacto en contratos existentes, riesgos y
su mitigación. Este skill no implementa — para eso, `/klap:desarrollar` o el flujo completo
`/klap:trabajar-hu`.
