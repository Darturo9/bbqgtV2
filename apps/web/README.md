# `@bbqbros/web`

Aplicación Next.js para la experiencia pública, el checkout y los paneles internos de BBQBros V2. Su
destino de despliegue será Vercel.

## Estado actual

Esta primera base contiene únicamente el App Router, TypeScript estricto, ESLint, Tailwind CSS y
Vitest. Todavía no incluye catálogo, checkout, administración, conexión con Supabase ni lógica de
negocio.

## Comandos

Ejecutar desde la raíz del monorepo:

```bash
pnpm --filter @bbqbros/web dev
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web build
```

El servidor de desarrollo estará disponible en [http://localhost:3000](http://localhost:3000).

## Responsabilidades futuras

- Mostrar catálogo, disponibilidad y cobertura.
- Construir el carrito y recopilar datos del checkout.
- Presentar seguimiento mediante un token público seguro.
- Ofrecer administración y operación según permisos.
- Invocar contratos del servidor sin contener reglas centrales del negocio.

Las reglas del restaurante deberán permanecer en `packages/domain`; los componentes de React no
serán la fuente de verdad de precios, cobertura ni estados.
