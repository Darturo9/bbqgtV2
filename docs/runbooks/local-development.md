# Desarrollo local

Estado: Supabase local inicializado; catálogo y migraciones aún pendientes.

## Requisitos aprobados

- Node.js 24 LTS, versión indicada en `.nvmrc` y `.node-version`.
- pnpm fijado por `packageManager`.
- Docker Desktop con su motor en ejecución para Supabase local.

## Preparación

```bash
pnpm install
pnpm check
```

Si una instalación global de pnpm no puede resolver la versión fijada, ejecutar el mismo script
mediante Corepack sin cambiar dependencias del sistema:

```bash
corepack pnpm@12.4.1 <script>
```

## Supabase local

Iniciar los servicios y consultar sus URLs:

```bash
pnpm db:start
pnpm db:status
```

Reconstruir la base local desde migraciones y seed:

```bash
pnpm db:reset
```

`db:reset` es destructivo únicamente para la base local. En las primeras etapas puede mostrar que no
existen migraciones o archivos seed; esto dejará de ser cierto cuando se implemente el catálogo.

Validar SQL, advisors y pruebas pgTAP:

```bash
pnpm db:lint
pnpm db:advisors
pnpm db:test
```

Detener los servicios conservando sus volúmenes:

```bash
pnpm db:stop
```

No utilizar `--no-backup` para la parada cotidiana.

## Si Docker no responde

1. Abrir Docker Desktop.
2. Esperar a que `docker info` muestre el servidor.
3. Reintentar `pnpm db:start`.

No se debe ignorar un health check ni declarar listo el ambiente si los contenedores no están
saludables.

## Restricciones

- No usar la base de V1.
- No copiar `.env` de V1.
- No usar datos personales reales como fixtures.
- No iniciar una integración productiva desde local.
- No ejecutar `supabase link` ni variantes `--linked` desde este flujo.
- No exponer las URLs locales a Internet; el ambiente usa credenciales de desarrollo.
- No declarar que staging o producción funcionan basándose solo en este ambiente.
