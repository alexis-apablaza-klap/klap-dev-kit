# Instalación

Klap Dev-Kit se distribuye como plugin de Claude Code vía un marketplace git privado. No hay
que clonar ni compilar nada manualmente para usarlo dentro de Claude Code.

## 1. Agregar el marketplace (una vez por máquina)

```
/plugin marketplace add https://github.com/klap-cl/klap-dev-kit.git
```

## 2. Instalar el plugin

```
/plugin install klap@klap-dev-kit
```

Esto registra los 8 comandos `/klap:*`, los 6 agentes, los hooks de validación y el servidor
MCP mock de Klap Knowledge (se activa solo, no requiere configuración adicional para empezar
a probar el flujo).

## 3. Actualizar

```
/plugin update klap@klap-dev-kit
```

Como `plugin.json` declara una `version` explícita (SemVer), sólo se actualiza cuando se
publica una nueva versión — no en cada push al repo.

## Requisitos

- Claude Code con soporte de plugins.
- Node.js ≥ 18 (los scripts y hooks del kit son `.mjs` puros de Node).
- Git.
- Acceso a los MCP externos que uses en cada fase: Atlassian (Jira/Confluence) para
  `/klap:trabajar-hu` y `/klap:analizar`; SonarQube para `/klap:certificar`. Si no están
  conectados, esas fases lo declaran explícitamente en vez de fallar en silencio.
- Para certificación completa en el propio repo de trabajo: el wrapper de build del proyecto
  (`gradlew`/`mvnw`/`npm`), y opcionalmente Trivy / OWASP Dependency-Check para el escaneo de
  dependencias (`scripts/deps-scan.mjs` detecta si no están instalados y lo informa, no falla
  en silencio).

## Bootstrap (opcional)

`bootstrap/install.ps1` (Windows) e `install.sh` (Linux/Mac) automatizan la verificación de
prerequisitos (Node, Java, Git) y la instalación de Trivy/OWASP Dependency-Check cuando falten.
No reemplazan el paso 1-2 de arriba — el plugin en sí se instala siempre por el mecanismo
nativo de Claude Code, nunca por un CLI propio.

## Verificar la instalación

Después de instalar, confirma que el plugin quedó coherente:

```
claude plugin validate --strict
```

Y que los comandos aparecen: escribe `/klap:` en el prompt y deberían listarse los 8 skills
(ver `docs/commands.md`).
