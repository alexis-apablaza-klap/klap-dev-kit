La nota de Confluence menciona "el servicio conciliador" en prosa, sin un repo conocido ni una
representación confirmada en Klap Knowledge para ese producto.

¿El artefacto de salida evita transformar esa mención textual en un `component_id` concreto
(p.ej. `ms-conciliador`) presentado como si fuera un componente ya identificado, dejándolo en
cambio como candidato pendiente de confirmar (pregunta abierta o nota explícita de que no hay
`component_id` real que mapear)?

Reprueba si el patch propuesto incluye una operación `upsert_component` o
`upsert_component_link` para un componente mencionado sólo en prosa (Jira/Confluence) sin dejar
constancia explícita de que el `component_id` es inferido y no confirmado, o sin `sources` que
lo respalden.
