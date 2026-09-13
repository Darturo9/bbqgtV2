# Desarrollo local

Estado: Supabase local implementado con catálogo multimarcas, RLS, Storage, seed sintético, pruebas
pgTAP y contrato TypeScript generado.

## Requisitos aprobados

- Node.js 24 LTS, versión indicada en `.nvmrc` y `.node-version`.
- pnpm `12.4.1`, fijado mediante `packageManager`.
- Docker Desktop con su motor en ejecución para Supabase local.

## Preparación del monorepo

```bash
pnpm install
pnpm check
```

`pnpm check` valida gobierno, secretos, formato, lint, TypeScript, pruebas y builds de los paquetes.
No inicia Supabase ni reconstruye la base.

Si una instalación global de pnpm no puede resolver la versión fijada, ejecutar el mismo script
mediante Corepack sin cambiar dependencias del sistema:

```bash
corepack pnpm@12.4.1 <script>
```

## Iniciar Supabase local

```bash
pnpm db:start
pnpm db:status
```

La primera ejecución puede tardar mientras Docker descarga las imágenes. No usar
`--ignore-health-check`: el ambiente solo está listo cuando la CLI confirma que los servicios están
saludables.

Puertos locales configurados:

| Servicio        | Dirección local                         |
| --------------- | --------------------------------------- |
| API y REST      | `http://127.0.0.1:54321`                |
| PostgreSQL      | `postgresql://127.0.0.1:54322/postgres` |
| Supabase Studio | `http://127.0.0.1:54323`                |
| Mailpit         | `http://127.0.0.1:54324`                |

`pnpm db:status` muestra las direcciones y credenciales locales vigentes. Estas credenciales son
solo para desarrollo y no deben copiarse a staging, producción ni documentación versionada.

## Verificación completa de la base

Con Supabase iniciado:

```bash
pnpm check:database
```

Este comando ejecuta en orden:

1. `db:reset`: destruye exclusivamente la base local y la reconstruye desde migraciones y seed;
2. `db:lint`: revisa el esquema `public`;
3. `db:advisors`: ejecuta advisors de rendimiento y seguridad;
4. `db:test`: ejecuta las suites pgTAP;
5. `db:types:check`: comprueba que el contrato TypeScript coincide con el esquema reconstruido.

El comando es apropiado antes de cada commit que modifique `supabase/`. No debe ejecutarse si hay
datos locales temporales que todavía necesiten conservarse.

Las verificaciones también pueden ejecutarse individualmente:

```bash
pnpm db:reset
pnpm db:lint
pnpm db:advisors
pnpm db:test
pnpm db:types:check
```

## Migraciones y tipos

Crear el archivo de una migración mediante la CLI, revisar su timestamp generado y editar solamente
ese archivo:

```bash
pnpm exec supabase migration new <nombre_descriptivo>
```

Después de cambiar el esquema:

```bash
pnpm db:reset
pnpm db:types
pnpm check:database
```

`pnpm db:types` actualiza `packages/contracts/src/database.types.ts` desde el esquema local
`public`. El archivo generado se versiona, pero no se edita manualmente. Un cambio inesperado en él
debe revisarse junto con la migración que lo produjo.

## Detener Supabase

```bash
pnpm db:stop
```

La parada normal conserva los volúmenes para el siguiente inicio. No utilizar `--no-backup` en el
flujo cotidiano porque elimina los datos locales almacenados.

## Si Docker no responde

1. Abrir Docker Desktop.
2. Esperar a que `docker info` muestre tanto el cliente como el servidor.
3. Reintentar `pnpm db:start`.

Si los contenedores existen pero no inician correctamente, ejecutar una parada conservadora y volver
a iniciar:

```bash
pnpm db:stop
pnpm db:start
```

No instalar, reconfigurar o limpiar Docker automáticamente. `supabase stop --no-backup` es un último
recurso destructivo y requiere decidir conscientemente que los datos locales pueden eliminarse.

## Integración continua

GitHub Actions ejecuta dos trabajos independientes: calidad del monorepo y verificación de base de
datos. El segundo crea un Supabase local efímero, ejecuta `pnpm check:database` y lo detiene en un
paso `always()`. No necesita secretos ni un proyecto remoto enlazado.

## Restricciones

- No usar la base de V1 ni copiar su `.env`.
- No usar datos personales o comerciales reales como fixtures.
- No exponer las URLs locales a Internet; el ambiente usa credenciales de desarrollo.
- No iniciar integraciones productivas desde local.
- No ejecutar `supabase link` en el desarrollo cotidiano.
- No añadir `--linked` a `db:reset`, generación de tipos, pruebas o verificaciones locales.
- No usar `db push`, `db pull` o `--include-seed` sin un plan explícito para el ambiente remoto.
- No declarar que staging o producción funcionan basándose solamente en este ambiente.
