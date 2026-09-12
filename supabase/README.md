# Supabase de BBQBros V2

Esta carpeta será la única fuente de verdad de la base de datos.

## Ambientes

- Local: desarrollo desechable mediante Supabase CLI.
- Staging: proyecto nuevo en la nube con datos sintéticos.
- Producción: proyecto nuevo, aislado y promovido después de staging.

## Reglas

- Crear migraciones con `pnpm supabase migration new <nombre>`.
- No inventar timestamps ni mantener migraciones dentro de `apps/`.
- Toda tabla expuesta requiere permisos explícitos y RLS.
- Una política `TO authenticated` necesita además una condición de autorización.
- Las políticas de actualización requieren `USING` y `WITH CHECK`.
- Preferir funciones `SECURITY INVOKER`; justificar y restringir cualquier `SECURITY DEFINER`.
- Verificar reconstrucción local y ejecutar los advisors disponibles antes de promover una
  migración.

La configuración local de Supabase se generará con la CLI en un cambio separado. Todavía no existen
tablas ni migraciones.
