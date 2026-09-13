# Pruebas de base de datos

Los archivos SQL de este directorio son suites pgTAP ejecutadas mediante `pnpm db:test`.

- `001_schema.test.sql` verifica estructura, seguridad inicial y timestamps del catálogo.
- `002_catalog_constraints.test.sql` verifica datos válidos, checks, unicidad, relaciones y
  aislamiento multimarcas.
- `003_catalog_rls.test.sql` verifica privilegios y políticas con los roles reales `anon` y
  `authenticated`.

Cada suite se ejecuta dentro de una transacción y revierte sus datos de prueba al terminar.
