# Desarrollo local

Estado: estructura definida; servicios aún no inicializados.

## Requisitos aprobados

- Node.js 24 LTS, versión indicada en `.nvmrc` y `.node-version`.
- pnpm fijado por `packageManager`.
- Docker Desktop para Supabase local cuando se habilite.

## Preparación actual

```bash
pnpm install
pnpm check
```

La inicialización de Next.js, NestJS y Supabase se realizará en cambios separados. Cuando Supabase
esté configurado, este runbook incluirá inicio, estado, reset, pruebas y parada usando comandos
descubiertos con `supabase --help`.

## Restricciones

- No usar la base de V1.
- No copiar `.env` de V1.
- No usar datos personales reales como fixtures.
- No iniciar una integración productiva desde local.
- No declarar que staging o producción funcionan basándose solo en este ambiente.
