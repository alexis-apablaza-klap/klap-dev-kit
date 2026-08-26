# Registro de Cambio — {{issue_key}}: {{titulo}}

- **Fecha:** {{fecha}}
- **Producto(s):** {{productos}}
- **Componente(s) afectado(s):** {{componentes}}
- **Autor:** {{autor}}
- **Certificación:** {{estado_certificacion}} <!-- referenciar certificacion.json -->

## Qué cambió

{{descripcion_cambio}}
<!-- Qué cambió realmente, no un resumen genérico del commit. -->

## Por qué

{{motivo}}
<!-- Objetivo de negocio o técnico que originó el cambio. Referenciar la HU. -->

## Impacto

- **Contratos (REST/Kafka):** {{impacto_contratos}} <!-- "sin cambios" si aplica -->
- **Datos/esquemas:** {{impacto_datos}}
- **Componentes consumidores potencialmente afectados:** {{componentes_consumidores}}
- **Configuración/despliegue:** {{impacto_deployment}}

## Rollback

{{procedimiento_rollback}}
<!-- Cómo revertir si algo falla en producción. Si no es reversible de forma simple, decirlo. -->

## Referencias

- Jira: {{link_jira}}
- Pull Request: {{link_pr}}
- ADR relacionado (si aplica): {{link_adr}}
