# Implementación de la base del monorepo

- Estado: completed
- Fecha: 2026-09-12
- Diseño relacionado: `2026-09-12-foundation-design.md`

## Objetivo

Crear una base versionada y verificable sin implementar funcionalidad del restaurante ni conectar
servicios externos.

## Trabajo realizado

- [x] Crear instrucciones canónicas de Codex.
- [x] Configurar pnpm Workspaces y Turborepo.
- [x] Fijar Node.js LTS y versiones de herramientas fundacionales.
- [x] Crear límites físicos para web, API, dominio, contratos, configuración y pruebas.
- [x] Crear una única raíz de Supabase sin tablas ni migraciones.
- [x] Organizar documentación por producto, arquitectura, decisiones, planes y runbooks.
- [x] Añadir controles iniciales de gobierno y patrones de secretos.
- [x] Añadir CI para ejecutar los controles del repositorio.

## Fuera de alcance

- Scaffold de Next.js o NestJS.
- Inicio de Supabase local.
- Esquema de base de datos.
- Conexiones con Vercel, Railway o proveedores.
- Código copiado o migrado desde V1.

## Verificación esperada

- Instalación reproducible mediante lockfile.
- `pnpm check` exitoso.
- Un único `AGENTS.md` versionado.
- Árbol y documentación coherentes con el diseño aprobado.
