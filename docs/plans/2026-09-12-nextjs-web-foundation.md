# Base de Next.js para `apps/web`

- Estado: implementado
- Fecha: 2026-09-12
- Alcance: scaffold y controles de calidad de la aplicación web

## Objetivo

Convertir el marcador de posición `apps/web` en una aplicación Next.js mínima y verificable, sin
adelantar funcionalidades del restaurante ni conectar servicios externos.

## Decisiones

- Next.js 16.3.5 con App Router y Turbopack predeterminado.
- React 19.2.8, según la combinación producida por `create-next-app` 16.3.5.
- TypeScript 5.9.3 en modo estricto y sin JavaScript implícito.
- ESLint mediante la configuración oficial `core-web-vitals` y TypeScript.
- Tailwind CSS 4 disponible desde la base, sin crear todavía un sistema visual definitivo.
- Vitest 5, jsdom y React Testing Library para pruebas unitarias y de componentes síncronos.
- Resolución nativa de alias de TypeScript mediante Vite, sin un complemento redundante.
- Código de la aplicación dentro de `src/` y alias `@/*`.
- Ningún `AGENTS.md` adicional: la guía canónica continúa en la raíz del monorepo.
- Dependencias con versiones exactas para mantener instalaciones reproducibles.

## Archivos del generador revisados

Se ejecutó `create-next-app` fuera del repositorio para inspeccionar su resultado antes de
incorporar archivos. Se conservaron, con ajustes explícitos, `eslint.config.mjs`, `next-env.d.ts`,
`next.config.ts`, `postcss.config.mjs`, `tsconfig.json` y la estructura `src/app`.

No se incorporaron el `pnpm-workspace.yaml` ni el `.gitignore` internos porque el monorepo ya tiene
configuraciones canónicas en la raíz. El README genérico fue reemplazado por instrucciones propias
del proyecto.

## Verificación esperada

Los siguientes comandos deben ejecutar trabajo real para `@bbqbros/web`:

```bash
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web build
pnpm check
```

La prueba inicial comprueba que la portada exponga un encabezado accesible de pedidos a domicilio.
No pretende validar todavía un diseño visual ni un flujo de compra.

## Fuera de alcance

- Catálogo, carrito y checkout.
- Autenticación o panel administrativo.
- Supabase y migraciones.
- NeoPay, FEL, WhatsApp o GoNau.
- Diseño visual definitivo y recursos de marca.
- Pruebas end-to-end.
