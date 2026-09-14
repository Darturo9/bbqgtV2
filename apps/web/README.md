# `@bbqbros/web`

Aplicación Next.js para la experiencia pública, el checkout y los paneles internos de BBQBros V2. Su
destino de despliegue será Vercel.

## Estado actual

La aplicación cuenta con App Router, TypeScript estricto, ESLint, Tailwind CSS y Vitest. La frontera
de servidor consulta un catálogo público tipado desde Supabase, aplica las reglas de disponibilidad
de `@bbqbros/domain`, mantiene una caché breve por marca y sede, y presenta el resultado en la
página principal. Carrito, checkout y administración todavía no están implementados.

## Configuración local del catálogo

1. Inicia Supabase local desde la raíz con `pnpm db:start`.
2. Reconstruye el esquema y el seed versionado con `pnpm check:database`.
3. Copia `apps/web/.env.example` como `apps/web/.env.local`.
4. Ejecuta desde la raíz el siguiente comando para obtener únicamente la URL de API y la llave
   publicable locales:

```bash
pnpm exec supabase status -o json --agent no | node -e 'let input = ""; process.stdin.on("data", (chunk) => (input += chunk)); process.stdin.on("end", () => { const status = JSON.parse(input); console.log(`SUPABASE_URL=${status.API_URL}`); console.log(`SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`); });'
```

5. Copia esas dos líneas a `apps/web/.env.local`, reemplazando los valores ficticios. No copies
   `SECRET_KEY`, `SERVICE_ROLE_KEY`, `ANON_KEY`, `DB_URL` ni el JSON completo.

La configuración requerida es:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CATALOG_BRAND_SLUG
CATALOG_LOCATION_SLUG
```

Conserva en las otras dos líneas los slugs sintéticos `bbqbros` y `sucursal-demo-norte`. Las cuatro
variables se consumen únicamente desde el servidor: no deben usar el prefijo `NEXT_PUBLIC_`.
`.env.local` está ignorado por Git y nunca debe versionarse.

## Ejecutar y comprobar el catálogo

Con Supabase iniciado, el seed reconstruido y `.env.local` preparado:

```bash
pnpm --filter @bbqbros/web dev
```

Abre [http://localhost:3000](http://localhost:3000). El recorrido correcto debe mostrar:

- marca `BBQBROS` y sede `Sucursal Demo Norte`;
- una sola categoría, `Combos de Prueba`;
- `Combo Clásico Demo` con precio `Q65.00`;
- `Combo Oferta Demo` con precio vigente `Q69.90` y precio regular `Q80.00`;
- ningún producto, categoría o vínculo de disponibilidad inactivo.

Son datos deliberadamente sintéticos para desarrollo. No sustituyen el catálogo comercial ni deben
copiarse a staging o producción.

La integración real se valida de forma separada de las pruebas unitarias:

```bash
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web test:integration
```

`test:integration` requiere Supabase local iniciado y el seed reconstruido. Usa la llave publicable
entregada por la CLI; no requiere una llave secreta ni un proyecto remoto.

## Comandos

Ejecutar desde la raíz del monorepo:

```bash
pnpm --filter @bbqbros/web dev
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web test:integration
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
