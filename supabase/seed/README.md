# Datos iniciales

`001_catalog.sql` contiene el catálogo sintético y determinista usado en desarrollo local y pruebas.
Supabase lo ejecuta después de las migraciones durante `pnpm db:reset`.

Los datos reales de BBQBROS no se copiarán desde V1 sin un plan de migración aprobado. Este seed no
debe promoverse a producción mediante `--include-seed`.
