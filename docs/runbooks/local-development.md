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

## Preparar la web con credenciales públicas locales

Copia la plantilla sin modificarla ni versionar valores locales:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Obtén únicamente los dos valores públicos que necesita la web. El filtro evita imprimir el JSON de
estado completo, que también contiene credenciales privilegiadas locales:

```bash
pnpm exec supabase status -o json --agent no | node -e 'let input = ""; process.stdin.on("data", (chunk) => (input += chunk)); process.stdin.on("end", () => { const status = JSON.parse(input); console.log(`SUPABASE_URL=${status.API_URL}`); console.log(`SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`); });'
```

Reemplaza las dos líneas ficticias correspondientes dentro de `apps/web/.env.local` y conserva los
slugs locales incluidos en la plantilla:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CATALOG_BRAND_SLUG
CATALOG_LOCATION_SLUG
```

La llave debe comenzar con `sb_publishable_`. No uses `sb_secret_`, `service_role`, la llave `anon`
heredada ni una URL de base de datos. Ninguna de estas variables lleva el prefijo `NEXT_PUBLIC_`, y
`apps/web/.env.local` nunca se versiona.

## Ejecutar y revisar la web

Con Supabase iniciado y `pnpm check:database` aprobado:

```bash
pnpm --filter @bbqbros/web dev
```

Abre [http://localhost:3000](http://localhost:3000). El catálogo sintético esperado contiene
exactamente:

| Nivel     | Valor esperado                                           |
| --------- | -------------------------------------------------------- |
| Marca     | `BBQBROS`                                                |
| Sede      | `Sucursal Demo Norte`                                    |
| Categoría | `Combos de Prueba`                                       |
| Producto  | `Combo Clásico Demo`, precio vigente `Q65.00`            |
| Producto  | `Combo Oferta Demo`, `Q69.90` vigente y `Q80.00` regular |

La página debe revisarse al menos en un viewport móvil de `390 × 844` y uno de escritorio de
`1440 × 900`. En ambos casos comprueba que no exista desbordamiento horizontal, texto recortado,
superposición, recursos fallidos ni errores en la consola. La jerarquía debe conservar un único
`h1`, categorías como `h2` y productos como artículos dentro de listas.

## Estados públicos del catálogo

El contrato distingue cuatro resultados sin exponer detalles internos:

| Estado      | Comprobación                                                   |
| ----------- | -------------------------------------------------------------- |
| `success`   | Integración real contra el seed local y revisión visual        |
| `empty`     | Prueba de componente con marca y sede conocidas, sin vendibles |
| `not_found` | Integración con marca y sede desconocidas                      |
| `failure`   | Pruebas de servicio/página con causa interna sanitizada        |

Las pruebas controladas no modifican el seed. Para repetir la certificación:

```bash
pnpm check
pnpm check:database
pnpm --filter @bbqbros/web test:integration
```

El build de producción también debe aprobar con Supabase detenido, sin `.env.local` y sin las cuatro
variables definidas. Durante el build no se consulta la base; la lectura ocurre al atender la
petición dinámica.

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
datos. El segundo crea un Supabase local efímero, ejecuta `pnpm check:database`, valida la
integración web con la llave publicable local y lo detiene en un paso `always()`. No necesita
secretos ni un proyecto remoto enlazado.

## Restricciones

- No usar la base de V1 ni copiar su `.env`.
- No usar datos personales o comerciales reales como fixtures.
- No exponer las URLs locales a Internet; el ambiente usa credenciales de desarrollo.
- No iniciar integraciones productivas desde local.
- No ejecutar `supabase link` en el desarrollo cotidiano.
- No añadir `--linked` a `db:reset`, generación de tipos, pruebas o verificaciones locales.
- No usar `db push`, `db pull` o `--include-seed` sin un plan explícito para el ambiente remoto.
- No declarar que staging o producción funcionan basándose solamente en este ambiente.
