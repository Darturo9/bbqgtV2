# ADR-0003: Supabase nuevo con tres ambientes

- Estado: accepted
- Fecha: 2026-09-12

## Contexto

La historia de migraciones de V1 no permite reconstruir con confianza su esquema. Conectarla
directamente a V2 trasladaría esa incertidumbre.

## Decisión

Usar Supabase local para desarrollo y proyectos nuevos e independientes para staging y producción.
Mantener `supabase/migrations` como única fuente de verdad.

## Consecuencias

- La base V1 permanece intacta.
- Las migraciones deben reconstruir local desde cero.
- Los datos que se conserven necesitarán un proceso de migración explícito.
- Permisos de Data API y RLS se diseñarán como controles separados.
