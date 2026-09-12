# BBQBros V2

Nueva plataforma multimarcas de pedidos a domicilio. El primer lanzamiento será exclusivamente para
BBQBROS y se construirá de manera independiente de la V1.

## Estado

El repositorio se encuentra en su fase fundacional. La arquitectura y el alcance están aprobados;
`apps/web` ya cuenta con una base verificable de Next.js, pero todavía no contiene funcionalidad de
negocio. La API de integraciones continúa como marcador de posición.

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
pnpm --filter @bbqbros/web dev
```

Los comandos de Supabase se habilitan mediante la dependencia local del repositorio. Docker será
necesario cuando comience la configuración del ambiente local, pero esta fase todavía no inicia
servicios.

## Documentación

Comenzar por [docs/README.md](docs/README.md) y por el
[diseño fundacional](docs/plans/2026-09-12-foundation-design.md).
