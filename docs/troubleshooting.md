# Problemas frecuentes

## Jira/Confluence "no están disponibles" en una fase

Revisa `claude mcp list`. Si `plugin:klap:atlassian` dice `! Needs authentication`, falta el
paso de onboarding: `/mcp` → `atlassian` → **Authenticate** con tu cuenta corporativa. El
servidor lo trae el plugin, pero la autenticación es personal y no se hereda de nadie.

Si al volver del navegador ves `Invalid context provided. Please try authorizing again`,
**revisa `claude mcp list` antes de reintentar**: ese mensaje ha aparecido con la autenticación
ya completada correctamente.

## Atlassian conectado, pero un recurso da error de permisos

Son dos fallos distintos y el kit los reporta distinto (ver `docs/atlassian-mcp.md`): que el MCP
esté `✔ Connected` no implica que tengas acceso a cada proyecto, espacio o workspace. Un error de
acceso significa que tu cuenta no tiene ese permiso en Atlassian — se resuelve con quien
administre el recurso, no con otra credencial. El kit nunca cae a un token compartido.

Caso particular de Bitbucket: `Your Bitbucket workspace must be linked to an Atlassian
organization to use MCP tools` significa que ese workspace no está vinculado a la organización.
Escálalo a un admin de Atlassian/Bitbucket.

> **Ojo con Jira:** una búsqueda JQL sobre un proyecto sin acceso devuelve una lista vacía **sin
> error**. Un resultado vacío no prueba que no exista nada.

## "Klap Knowledge no responde" durante `/klap:trabajar-hu`

Comportamiento esperado, no una falla: si el MCP de Klap Knowledge no está disponible, el
agente `analista` lo declara explícitamente en `contexto.md` y continúa con Jira + la memoria
del repo (`docs/context/index.yaml`). No debería inventar un resumen de
producto o componente. Si ves que sí lo inventó, es un bug de comportamiento del agente, no
del MCP — repórtalo.

Para desarrollo/pruebas locales, el mock (`mocks/klap-knowledge-mcp/`) se activa solo al
instalar el plugin (`.mcp.json`); si igual falla, revisa que Node ≥18 esté disponible en el
`PATH` que usa Claude Code.

## `git push` bloqueado por falta de certificación

El hook `hooks/pre-push-quality-gate.mjs` intercepta cualquier `git push` cuando el nombre de
la rama contiene un patrón `<PREFIJO>-<número>` (p.ej. `feature/KLAP-123-algo`) y exige que
exista `.klap/hu/KLAP-123/certificacion.json` con `aprobado: true`. Si no existe el archivo, o
existe con `aprobado: false`, el push se bloquea con el motivo exacto en el mensaje.

Solución: corre `/klap:certificar` (o completa `/klap:trabajar-hu` hasta la fase 6) hasta
obtener un veredicto aprobado antes de reintentar el push.

Nota: ramas cuyo nombre **no** contiene ese patrón no son interceptadas por este hook — el
respaldo para esos casos es el gate de CI, no un hook local.

## `git commit` bloqueado por un posible secreto (falso positivo)

El hook `hooks/pre-commit-secret-scan.mjs` corre `scripts/escanear-secretos.mjs` sobre
`git diff --cached` antes de cualquier `git commit`. Es un conjunto de patrones (AWS keys,
JWT, llaves privadas, `password=`/`token=`/`secret=` con valor largo, etc.) — puede marcar
falsos positivos, sobre todo en fixtures de test o ejemplos de documentación.

El hook intercepta la llamada a la herramienta `Bash` en sí, así que `git commit --no-verify`
**no** lo evita (ese flag sólo desactiva los hooks nativos de Git, no este hook de Claude
Code). Opciones reales:

1. Si es un valor de ejemplo, marca la línea de forma que el escáner la reconozca como tal:
   agrega uno de los marcadores que el escáner ya ignora (`CHANGEME`, `example`, `placeholder`,
   `dummy`, `xxxx`) en vez de un valor con forma de secreto real. Nota: una referencia
   `${VAR:fallback}` real ya no hace falta marcarla — los patrones de secreto no matchean
   dentro de `${...}` por diseño, pero un secreto real en la misma línea (p.ej. en un
   comentario junto a la referencia) sí se sigue detectando, como corresponde.
2. Si el patrón genera falsos positivos de forma sistemática para tu stack, es un problema del
   propio kit — ajusta `PATRONES` en `scripts/escanear-secretos.mjs` vía PR, no lo rodees caso
   a caso.
3. Si es un secreto real, sácalo del commit y resuélvelo con el gestor de secretos que
   corresponda (`standards/seguridad`) — el bloqueo está haciendo su trabajo.

## `claude plugin validate` falla

Corre primero `node scripts/validar-plugin.mjs` desde la raíz del kit — cubre buena parte de
lo mismo (manifests JSON válidos, `config/klap.yaml` contra su schema, `standards/index.yaml`
con todos sus `path` existentes, cada `SKILL.md`/`agents/*.md` con frontmatter completo, y que
`hooks/hooks.json` no referencie scripts inexistentes) con mensajes más específicos sobre cuál
archivo y qué campo está mal.

## `npm run eval` dice ``` `plugin eval` is currently in early access ```

`claude plugin eval` (usado por `evals/`) es una función en early access de Claude Code — el
flag se habilita del lado de Anthropic a nivel de organización, no hay setting local que lo
active. Detalle completo (qué hace, estado de la solicitud, por qué no bloquea nada) en
`docs/claude-plugin-eval.md`. Auto-test rápido: en un directorio sin casos, `No eval cases
found` significa que ya está habilitado; si sigues viendo el mensaje de early access, no.

## `/klap:trabajar-hu` no muestra los 8 comandos tras instalar

Confirma que `/plugin list` muestra `klap` como instalado. Si tienes el repo clonado
localmente, `claude plugin validate --strict <ruta-al-repo>` valida el manifest. Si el
marketplace no se actualizó, `/plugin marketplace add` de nuevo sobre la misma URL refresca el
catálogo.
