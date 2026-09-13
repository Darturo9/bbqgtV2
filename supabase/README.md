# Supabase de BBQBros V2

Esta carpeta será la única fuente de verdad de la base de datos.

## Estado

El ambiente local está inicializado con Supabase CLI `2.117.0` y PostgreSQL 17. Las migraciones
crean el núcleo multimarcas del catálogo y sus relaciones: marcas, sedes, categorías, productos,
modificadores, asignaciones, condiciones y disponibilidad por sede. El catálogo activo ya tiene
lectura pública protegida mediante privilegios mínimos y RLS. Storage incluye el bucket público
`catalog`, restringido a imágenes aprobadas de hasta 2 MiB y sin escritura desde roles cliente. El
seed local reconstruye un catálogo BBQBROS completamente sintético y una marca ficticia inactiva
para comprobar el comportamiento del modelo y de RLS.

`config.toml` desactiva la exposición automática de tablas a Data API. Cada tabla futura necesitará
grants y RLS explícitos en su migración.

Las doce tablas actuales tienen RLS habilitada. Los roles `anon` y `authenticated` reciben solamente
`SELECT` y ven registros activos cuyos padres también son visibles. La disponibilidad pública exige
además `is_available = true`; ambos roles carecen de permisos de escritura.

El bucket `catalog` sirve imágenes públicas desde rutas relativas como
`bbqbros/products/archivo.webp`. No existe ninguna política de carga, actualización o eliminación
para `anon` o `authenticated`.

Los datos de `seed/` son exclusivos de desarrollo y pruebas. Usan UUID constantes y nombres con
marcadores como `Demo` o `de Prueba`; no contienen información comercial ni personal de V1.

## Contrato implementado

La historia canónica contiene cuatro migraciones, aplicadas en este orden:

| Migración                                         | Responsabilidad                                     |
| ------------------------------------------------- | --------------------------------------------------- |
| `20260913030129_create_catalog_core.sql`          | seis entidades principales, timestamps y checks     |
| `20260913031035_create_catalog_relationships.sql` | asignaciones, condiciones y disponibilidad por sede |
| `20260913031927_secure_public_catalog.sql`        | grants mínimos, RLS pública e índices               |
| `20260913032848_configure_catalog_storage.sql`    | bucket `catalog` y restricciones de archivos        |

El resultado son 12 tablas públicas. El esquema conserva aislamiento por `brand_id`, importes en
centavos, UUID, desactivación editorial y disponibilidad explícita por sede. Las reglas de conjunto,
como ciclos completos de modificadores, permanecen en `packages/domain`.

La verificación está formada por cinco suites y 171 aserciones pgTAP:

| Suite                              | Aserciones | Cobertura principal                  |
| ---------------------------------- | ---------: | ------------------------------------ |
| `001_schema.test.sql`              |         29 | estructura, tipos, claves y RLS      |
| `002_catalog_constraints.test.sql` |         65 | checks e integridad multimarcas      |
| `003_catalog_rls.test.sql`         |         36 | lectura pública y bloqueo de cambios |
| `004_storage.test.sql`             |         14 | bucket, límites y permisos           |
| `005_seed.test.sql`                |         27 | datos sintéticos y proyección RLS    |

El cierre del 2026-09-13 produjo lint sin errores, advisors sin hallazgos y las 171 pruebas
aprobadas. `packages/contracts/src/database.types.ts` contiene el contrato TypeScript generado del
esquema `public`; `db:types:check` impide que quede desincronizado.

## Ambientes

- Local: desarrollo desechable mediante Supabase CLI.
- Staging: proyecto nuevo en la nube con datos sintéticos.
- Producción: proyecto nuevo, aislado y promovido después de staging.

## Reglas

- Crear migraciones con `pnpm exec supabase migration new <nombre>`.
- No inventar timestamps ni mantener migraciones dentro de `apps/`.
- Toda tabla expuesta requiere permisos explícitos y RLS.
- Una política `TO authenticated` necesita además una condición de autorización.
- Las políticas de actualización requieren `USING` y `WITH CHECK`.
- Preferir funciones `SECURITY INVOKER`; justificar y restringir cualquier `SECURITY DEFINER`.
- Verificar reconstrucción local y ejecutar los advisors disponibles antes de promover una
  migración.

## Comandos locales

```bash
pnpm db:start
pnpm db:status
pnpm check:database
pnpm db:reset
pnpm db:lint
pnpm db:advisors
pnpm db:test
pnpm db:types
pnpm db:types:check
pnpm db:stop
```

`db:reset` destruye y reconstruye únicamente la base local. `db:stop` conserva los volúmenes. Los
comandos no enlazan staging o producción. `check:database` exige Supabase iniciado y ejecuta reset,
lint, advisors, pruebas y comprobación del contrato TypeScript en ese orden.

El contrato generado vive en `packages/contracts/src/database.types.ts`. Se actualiza con
`pnpm db:types`, se versiona junto con las migraciones y no se edita manualmente.

GitHub Actions reproduce el mismo flujo en un trabajo de base independiente, sin secretos ni
proyectos remotos enlazados, y detiene Supabase aunque una comprobación falle.

La guía operativa completa está en
[`docs/runbooks/local-development.md`](../docs/runbooks/local-development.md).
