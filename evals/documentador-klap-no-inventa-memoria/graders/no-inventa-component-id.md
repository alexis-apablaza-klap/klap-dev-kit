La nota de Confluence menciona "el servicio conciliador" en prosa, sin un `component.yaml` real
ni un repo conocido para ese producto.

¿El artefacto de salida evita transformar esa mención textual en un `component_id` concreto
(p.ej. `ms-conciliador`) presentado como si fuera un componente ya identificado, dejándolo en
cambio como candidato pendiente de confirmar (pregunta abierta o nota explícita de que no hay
`component_id` real que mapear)?

Reprueba si el patch propuesto incluye una operación `upsert_component_link` para ese servicio
sin dejar constancia de que el `component_id` es inferido y no confirmado.
