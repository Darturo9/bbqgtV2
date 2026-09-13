# Pruebas de base de datos

Los archivos SQL de este directorio son suites pgTAP ejecutadas mediante `pnpm db:test`.

- `001_schema.test.sql` verifica estructura, seguridad inicial y timestamps del catálogo.
- `002_catalog_constraints.test.sql` verifica datos válidos, checks, unicidad, relaciones y
  aislamiento multimarcas.
- `003_catalog_rls.test.sql` verifica privilegios y políticas con los roles reales `anon` y
  `authenticated`.
- `004_storage.test.sql` verifica el bucket público y el bloqueo efectivo de escrituras cliente.
- `005_seed.test.sql` verifica el contenido sintético y su proyección pública después de cada reset.

Cada suite se ejecuta dentro de una transacción y revierte sus datos de prueba al terminar.

La comprobación recomendada es `pnpm check:database` con Supabase local iniciado. Primero
reconstruye la base para que las pruebas nunca dependan del estado manual previo y después ejecuta
lint, advisors, estas suites y la comprobación del contrato TypeScript.
