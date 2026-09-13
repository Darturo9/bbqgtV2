# `@bbqbros/web`

Aplicación Next.js para la experiencia pública, el checkout y los paneles internos de BBQBros V2. Su
destino de despliegue será Vercel.

## Estado actual

La aplicación cuenta con App Router, TypeScript estricto, ESLint, Tailwind CSS y Vitest. La frontera
de servidor para consultar el catálogo ya puede validar su configuración y crear un cliente Supabase
tipado. La lectura del catálogo, checkout y administración todavía no están implementados.

## Configuración local del catálogo

1. Inicia Supabase local desde la raíz con `pnpm db:start`.
2. Consulta `pnpm db:status` y localiza la API URL y la llave publicable.
3. Copia `apps/web/.env.example` como `apps/web/.env.local`.
4. Sustituye el valor ficticio de `SUPABASE_PUBLISHABLE_KEY` por la llave local que comienza con
   `sb_publishable_`.

La configuración requerida es:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CATALOG_BRAND_SLUG
CATALOG_LOCATION_SLUG
```

Los valores sintéticos actuales son `bbqbros` y `sucursal-demo-norte`. Las cuatro variables se
consumen únicamente desde el servidor: no deben usar el prefijo `NEXT_PUBLIC_`. `.env.local` está
ignorado por Git y nunca debe versionarse.

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
