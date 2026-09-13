# BBQBros V2

Nueva plataforma multimarcas de pedidos a domicilio. El primer lanzamiento será exclusivamente para
BBQBROS y se construirá de manera independiente de la V1.

## Estado

La base del monorepo y `apps/web` están verificadas. `packages/domain` implementa las reglas puras
de precios, modificadores, disponibilidad por sede, carrito y revalidación del MVP.

Supabase local ya persiste el catálogo multimarcas mediante cuatro migraciones reproducibles, seed
sintético, RLS pública de solo lectura, Storage y 171 pruebas pgTAP. El contrato TypeScript de sus
12 tablas está versionado en `packages/contracts` y se comprueba automáticamente en CI.

La web todavía no consume el dominio ni Supabase. La API de integraciones continúa como marcador de
posición; pedidos, checkout, pagos, FEL y entrega siguen fuera de esta fase.

## Estructura

```text
apps/
  web/                 Aplicación Next.js para clientes y personal
  integrations-api/    API NestJS para NeoPay, FEL, WhatsApp y GoNau
packages/
  domain/              Reglas puras del negocio
  contracts/           Contratos compartidos entre procesos
  config/              Validación de configuración
  testing/             Utilidades comunes de prueba
supabase/
  migrations/          Única historia canónica del esquema
  seed/                Datos sintéticos de desarrollo
  tests/               Pruebas de base de datos y RLS
docs/                   Producto, arquitectura, ADR, planes y runbooks
```

## Herramientas base

- Node.js 24 LTS
- pnpm Workspaces
- Turborepo
- Next.js en Vercel
- NestJS en Railway
- Supabase local, staging y producción separados

## Primeros comandos

```bash
pnpm install
pnpm check
pnpm db:start
pnpm check:database
pnpm --filter @bbqbros/web dev
```

Supabase local requiere Docker Desktop. `check:database` reconstruye únicamente la base local y
ejecuta migraciones, seed, lint, advisors, pruebas y verificación de tipos. Consultar el
[runbook local](docs/runbooks/local-development.md) antes de reconstruir o detener el ambiente.

## Documentación

Comenzar por [docs/README.md](docs/README.md), por el
[diseño fundacional](docs/plans/2026-09-12-foundation-design.md) y por la
[guía del dominio](packages/domain/README.md). El contrato de persistencia está resumido en el
[README de Supabase](supabase/README.md).
