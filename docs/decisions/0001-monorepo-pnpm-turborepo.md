# ADR-0001: monorepo con pnpm y Turborepo

- Estado: accepted
- Fecha: 2026-09-12

## Contexto

La solución necesita dos aplicaciones y paquetes compartidos. V1 mantiene historias Git separadas
difíciles de coordinar.

## Decisión

Usar un solo repositorio con pnpm Workspaces para dependencias y Turborepo para orquestar tareas.

## Consecuencias

- Un commit puede cambiar contratos y consumidores de forma atómica.
- Existe un único lockfile.
- CI puede ejecutar tareas por dependencia.
- El repositorio debe evitar dependencias implícitas entre workspaces.
