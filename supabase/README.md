# Supabase de BBQBros V2

Esta carpeta será la única fuente de verdad de la base de datos.

## Estado

El ambiente local está inicializado con Supabase CLI `2.117.0` y PostgreSQL 17. Todavía no existen
tablas propias, migraciones ni datos seed; se crearán en las etapas siguientes del plan aprobado.

`config.toml` desactiva la exposición automática de tablas a Data API. Cada tabla futura necesitará
grants y RLS explícitos en su migración.

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
pnpm db:reset
pnpm db:lint
pnpm db:advisors
pnpm db:test
pnpm db:stop
```

`db:reset` destruye y reconstruye únicamente la base local. `db:stop` conserva los volúmenes. Los
comandos no enlazan staging o producción.

La guía operativa completa está en
[`docs/runbooks/local-development.md`](../docs/runbooks/local-development.md).
