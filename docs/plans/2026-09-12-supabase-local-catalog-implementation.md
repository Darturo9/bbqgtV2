# Plan de implementación de Supabase local para catálogo

- Estado: listo para implementar
- Fecha: 2026-09-12
- Diseño relacionado: `2026-09-12-supabase-local-catalog-design.md`
- Alcance: Supabase local, catálogo multimarcas, RLS, Storage, seed y pruebas
- CLI verificada al redactar el plan: `2.117.0`

## 1. Resultado esperado

Convertir el diseño aprobado en una base local reconstruible y probada sin conectar ningún proyecto
remoto. Al terminar, un clon limpio podrá iniciar Supabase, aplicar migraciones, cargar datos
sintéticos, ejecutar pruebas pgTAP y generar el contrato TypeScript de la base.

La implementación no añadirá pedidos, usuarios internos, datos reales ni integraciones externas.

## 2. Reglas de ejecución

- Trabajar sobre `main` siguiendo el gobierno actual del repositorio.
- Mantener V1 completamente intacta.
- Crear cada archivo de migración con `pnpm exec supabase migration new <nombre>`.
- No inventar timestamps de migración ni editar la tabla de historial.
- Usar `--local` en comandos que también admitan destinos remotos.
- No ejecutar `link`, `db push`, `db pull --linked`, `db reset --linked` ni comandos de producción.
- No copiar secretos o variables de V1.
- Modificar archivos de texto con parches revisables.
- Ejecutar `db reset` después de cambios de esquema o seed.
- Corregir migraciones locales antes de consolidarlas; no acumular migraciones de prueba fallidas.
- Detenerse si el destino de un comando destructivo no está inequívocamente limitado a local.
- Crear un commit pequeño después de aprobar cada etapa.

## 3. Prerrequisitos y bloqueo seguro

Antes de cambiar archivos:

```bash
git status --short --branch
node --version
corepack pnpm@12.4.1 --version
docker --version
docker info
corepack pnpm@12.4.1 exec supabase --version
```

Versiones esperadas:

- Node.js `24.21.x`;
- pnpm `12.4.1`;
- Supabase CLI `2.117.0`;
- Docker Desktop disponible y su motor en ejecución.

Si `docker info` no puede conectarse, no se instalará ni reconfigurará Docker. Se pedirá abrir
Docker Desktop y se reanudará cuando el motor responda.

## 4. Árbol objetivo

```text
.
├── .github/workflows/ci.yml
├── package.json
├── scripts/
│   └── database-types.mjs
├── packages/contracts/
│   ├── README.md
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── src/
│       ├── database.types.ts
│       └── index.ts
├── supabase/
│   ├── README.md
│   ├── config.toml
│   ├── migrations/
│   │   ├── <timestamp>_create_catalog_core.sql
│   │   ├── <timestamp>_create_catalog_relationships.sql
│   │   ├── <timestamp>_secure_public_catalog.sql
│   │   └── <timestamp>_configure_catalog_storage.sql
│   ├── seed/
│   │   └── 001_catalog.sql
│   └── tests/
│       ├── 001_schema.test.sql
│       ├── 002_catalog_constraints.test.sql
│       ├── 003_catalog_rls.test.sql
│       └── 004_storage.test.sql
└── docs/
    ├── README.md
    ├── plans/
    │   ├── 2026-09-12-supabase-local-catalog-design.md
    │   └── 2026-09-12-supabase-local-catalog-implementation.md
    └── runbooks/local-development.md
```

Los timestamps concretos serán los producidos por la CLI durante la implementación.

## 5. Contrato relacional previsto

### Entidades principales

| Tabla              | Clave primaria | Aislamiento                         |
| ------------------ | -------------- | ----------------------------------- |
| `brands`           | `id uuid`      | raíz                                |
| `locations`        | `id uuid`      | `(brand_id, id)`                    |
| `categories`       | `id uuid`      | `(brand_id, id)`                    |
| `products`         | `id uuid`      | `(brand_id, id)` y categoría propia |
| `modifier_groups`  | `id uuid`      | `(brand_id, id)`                    |
| `modifier_options` | `id uuid`      | marca y grupo propios               |

Cada entidad usará `default gen_random_uuid()` para registros normales. El seed suministrará UUID
explícitos.

Las columnas `name`, `slug` y cualquier descripción se normalizarán en los adaptadores. PostgreSQL
rechazará nombres o slugs vacíos. Los slugs usarán una forma simple en minúsculas con letras,
números y guiones.

### Relaciones

| Tabla                                | Identidad lógica                                     |
| ------------------------------------ | ---------------------------------------------------- |
| `category_modifier_groups`           | marca + categoría + grupo                            |
| `category_modifier_group_exclusions` | marca + categoría + grupo + producto                 |
| `product_modifier_groups`            | marca + producto + grupo                             |
| `modifier_conditions`                | marca + grupo padre + opción activadora + grupo hijo |
| `location_products`                  | marca + sede + producto                              |
| `location_modifier_options`          | marca + sede + opción                                |

Estas tablas usarán claves primarias compuestas. No necesitan un UUID artificial porque su identidad
ya está definida por la relación.

### Borrado y actualización

- Las entidades editoriales se desactivan con `is_active`.
- La disponibilidad cambia mediante `is_available`.
- Las claves foráneas no usarán cascadas amplias por defecto.
- Las tablas históricamente referenciables no tendrán borrado público.
- `created_at` y `updated_at` serán `timestamptz not null`.
- Una función pequeña `private.set_updated_at()` mantendrá `updated_at` mediante triggers simples.
- La función será `SECURITY INVOKER`, tendrá `search_path` fijo y no será parte de la Data API.

## 6. Restricciones previstas

### Texto e identidad

- `brands.slug` único globalmente.
- Sedes, categorías y productos: slug único por marca.
- `name` y `slug` no pueden quedar vacíos después de `btrim`.
- `display_order >= 0`.
- `currency_code = 'GTQ'`.

### Precios

- `regular_price_cents > 0`.
- `offer_price_cents is null or offer_price_cents > 0`.
- `offer_price_cents is null or offer_price_cents < regular_price_cents`.
- `price_adjustment_cents` admite todo `bigint`; el dominio valida el precio configurado completo.

### Modificadores

- `selection_type in ('single', 'multiple')`.
- `min_selections >= 0`.
- `max_selections >= 1`.
- `min_selections <= max_selections`.
- Para `single`, `max_selections = 1` y `min_selections in (0, 1)`.
- Una opción pertenece al grupo y marca declarados.
- Una exclusión referencia una asignación de categoría existente y, mediante una FK sobre
  `(brand_id, category_id, product_id)`, un producto de esa categoría.
- Una opción activadora pertenece al grupo padre mediante una FK sobre
  `(brand_id, parent_modifier_group_id, activating_modifier_option_id)`.
- `parent_modifier_group_id <> child_modifier_group_id`.

La detección de ciclos completos y la suficiencia de opciones activas permanecen en
`packages/domain` porque son invariantes de conjunto.

### Disponibilidad

- Sede y producto deben pertenecer a la misma marca.
- Sede y opción deben pertenecer a la misma marca.
- Una fila ausente o con `is_available = false` no habilita el elemento.
- Las relaciones son únicas por sede y recurso.

## 7. Índices previstos

- Índices para toda clave foránea que no quede cubierta por una clave primaria o unicidad existente.
- `locations (brand_id, is_active, display_order)` solo si se agrega orden de sede; de lo contrario,
  no anticipar la columna.
- `categories (brand_id, is_active, display_order)`.
- `products (brand_id, category_id, is_active, display_order)`.
- `modifier_groups (brand_id, is_active, display_order)`.
- `modifier_options (brand_id, modifier_group_id, is_active, display_order)`.
- `location_products (brand_id, location_id, is_available, product_id)`.
- `location_modifier_options (brand_id, location_id, is_available, modifier_option_id)`.

Durante la implementación se revisarán planes y advisors antes de conservar índices adicionales. No
se añadirán índices de búsqueda, analítica o pedidos.

## 8. Políticas de lectura previstas

Todas las tablas del catálogo tendrán RLS habilitada. Las políticas se nombrarán por tabla y acción,
por ejemplo `products_public_select`.

La política se aplicará `for select to anon, authenticated` y exigirá que el registro y sus padres
visibles estén activos. Para las relaciones, todos los extremos deben ser visibles; para
disponibilidad, además se exige `is_available = true`.

Antes de conceder lectura:

```sql
grant usage on schema public to anon, authenticated;
revoke all privileges on table public.<table> from anon, authenticated;
grant select on table public.<table> to anon, authenticated;
```

No se concederán `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` o `TRIGGER` a esos roles. No
se crearán políticas `for all` ni condiciones basadas únicamente en `TO authenticated`.

Las pruebas comprobarán tanto los grants como el resultado efectivo bajo RLS. La ausencia de una
política de escritura es deliberada.

## 9. Plan por etapas

### Etapa 1: inicializar y documentar el entorno local

Estado de ejecución: completada y verificada el 2026-09-12.

Archivos:

- crear `supabase/config.toml` con `supabase init`;
- actualizar `package.json`;
- actualizar `supabase/README.md`;
- actualizar `docs/runbooks/local-development.md`.

Acciones:

1. Confirmar que Docker responde.
2. Ejecutar `pnpm exec supabase init` desde la raíz.
3. Revisar completamente el archivo generado antes de editarlo.
4. Establecer un `project_id` local estable y no secreto.
5. Configurar `[db.seed]` con `sql_paths = ['./seed/*.sql']`.
6. No agregar referencias remotas, OAuth ni secretos.
7. Agregar scripts raíz:
   - `db:start`;
   - `db:status`;
   - `db:reset` con `--local`;
   - `db:lint` con `--local` y fallo en errores;
   - `db:advisors` con `--local` y fallo en errores;
   - `db:test` con `--local`;
   - `db:stop` sin `--no-backup`.
8. Iniciar Supabase y comprobar `status`.

Verificación:

```bash
pnpm db:start
pnpm db:status
pnpm check
```

Commit previsto:

```text
chore(database): initialize local Supabase
```

### Etapa 2: crear el núcleo del catálogo

Estado de ejecución: completada y verificada el 2026-09-12.

Archivos:

- crear mediante CLI `<timestamp>_create_catalog_core.sql`;
- crear `supabase/tests/001_schema.test.sql`;
- crear `supabase/tests/002_catalog_constraints.test.sql` con los primeros casos.

Tablas de esta migración:

- `brands`;
- `locations`;
- `categories`;
- `products`;
- `modifier_groups`;
- `modifier_options`.

También crea el esquema `private`, la función de timestamps y sus triggers. Cada tabla se define con
checks, unicidades compuestas y claves foráneas multimarcas desde el principio.

El esquema `private` revoca `USAGE` a `PUBLIC`, `anon` y `authenticated`; no forma parte de los
esquemas publicados por la Data API.

Pruebas iniciales:

- presencia de tablas y columnas;
- tipos UUID, `bigint`, boolean y `timestamptz`;
- claves primarias, unicidades y claves foráneas;
- RLS habilitada aunque todavía no exista lectura pública;
- rechazo de nombres vacíos, precios inválidos, órdenes negativas y rangos incompatibles;
- rechazo de producto u opción perteneciente a otra marca.

Flujo:

1. Crear primero las pruebas de estructura y restricciones.
2. Confirmar que fallan porque las tablas no existen.
3. Crear la migración mediante la CLI.
4. Implementar el SQL revisado.
5. Reconstruir y ejecutar pruebas.
6. Ejecutar lint y advisors locales.

Commit previsto:

```text
feat(database): create catalog core schema
```

### Etapa 3: modelar asignaciones y disponibilidad

Archivos:

- crear mediante CLI `<timestamp>_create_catalog_relationships.sql`;
- ampliar `002_catalog_constraints.test.sql`.

Tablas:

- `category_modifier_groups`;
- `category_modifier_group_exclusions`;
- `product_modifier_groups`;
- `modifier_conditions`;
- `location_products`;
- `location_modifier_options`.

Pruebas:

- aceptar asignación heredada y directa válidas;
- aceptar una exclusión respaldada por la asignación correspondiente;
- rechazar duplicados;
- rechazar exclusiones de otro producto o categoría;
- rechazar opciones activadoras ajenas al grupo padre;
- rechazar autorreferencias directas;
- rechazar disponibilidad que cruce marcas;
- aceptar de forma diferenciada relaciones de disponibilidad verdaderas y falsas.

Commit previsto:

```text
feat(database): model catalog relationships
```

### Etapa 4: aplicar privilegios y RLS pública

Archivos:

- crear mediante CLI `<timestamp>_secure_public_catalog.sql`;
- crear `supabase/tests/003_catalog_rls.test.sql`.

Acciones:

1. Revocar todos los privilegios de tabla a `anon` y `authenticated`.
2. Conceder solamente `SELECT` sobre las doce tablas.
3. Crear políticas explícitas de lectura activa.
4. Añadir índices necesarios para los predicados RLS.
5. No crear funciones `SECURITY DEFINER`.

Pruebas bajo roles reales:

- `anon` y `authenticated` leen la misma proyección pública;
- una marca inactiva oculta todos sus descendientes;
- una categoría inactiva oculta sus productos;
- un grupo inactivo oculta sus opciones y relaciones;
- solo aparece disponibilidad verdadera;
- `INSERT`, `UPDATE` y `DELETE` son rechazados;
- los privilegios concedidos coinciden exactamente con el contrato.

Commit previsto:

```text
feat(database): secure public catalog access
```

### Etapa 5: configurar Storage del catálogo

Archivos:

- crear mediante CLI `<timestamp>_configure_catalog_storage.sql`;
- crear `supabase/tests/004_storage.test.sql`.

La migración inserta de forma declarativa el bucket `catalog` con:

- lectura pública;
- límite de archivo de 2 MiB;
- MIME permitidos: JPEG, PNG, WebP y AVIF;
- ninguna política de escritura para `anon` o `authenticated`.

No modifica la estructura de las tablas administradas por Supabase Storage. Solo configura el bucket
y las políticas de objetos estrictamente necesarias.

Pruebas:

- existencia y configuración exacta del bucket;
- ausencia de permisos públicos de escritura;
- rechazo de inserción, actualización y eliminación anónimas en `storage.objects`.

Commit previsto:

```text
feat(database): configure catalog storage
```

### Etapa 6: crear el seed sintético

Archivo:

- crear `supabase/seed/001_catalog.sql`.

Contenido mínimo:

- marca BBQBROS activa y una marca ficticia inactiva;
- dos sedes ficticias de BBQBROS;
- una categoría activa y otra inactiva;
- productos normal, en oferta e inactivo;
- grupos `single` y `multiple`;
- opciones con ajustes positivo, cero y negativo;
- asignación heredada, exclusión y asignación directa;
- una condición válida;
- disponibilidad distinta por sede;
- filas falsas para comprobar el comportamiento seguro por defecto.

Todos los UUID serán constantes legibles y agrupados por entidad. Los nombres comerciales de los
productos serán ficticios. No se insertan objetos binarios en Storage.

Verificación:

```bash
pnpm db:reset
pnpm db:test
pnpm db:lint
pnpm db:advisors
```

La reconstrucción se ejecutará dos veces para comprobar que el resultado depende únicamente de las
migraciones y el seed.

Commit previsto:

```text
test(database): seed synthetic catalog
```

### Etapa 7: generar y versionar tipos de base de datos

Archivos:

- crear `scripts/database-types.mjs`;
- activar `packages/contracts` como paquete TypeScript;
- crear `packages/contracts/src/database.types.ts` mediante la CLI;
- crear `packages/contracts/src/index.ts`;
- actualizar `packages/contracts/README.md`;
- actualizar `package.json` y configuraciones TypeScript necesarias.

`database.types.ts` es un contrato interno generado desde nuestro esquema, no un DTO de proveedor.
La entrada pública de `@bbqbros/contracts` expondrá el tipo `Database` sin importar Supabase dentro
de `packages/domain`.

El script tendrá dos modos:

- escribir la salida generada;
- comprobar que el archivo versionado coincide exactamente con la base local.

Scripts raíz:

- `db:types`;
- `db:types:check`.

Pruebas:

- el paquete compila en ESM;
- la entrada pública exporta el contrato;
- modificar el archivo generado hace fallar el modo de comprobación;
- regenerarlo elimina la diferencia.

Commit previsto:

```text
chore(contracts): publish generated database types
```

### Etapa 8: integrar la verificación local y CI

Archivos:

- actualizar `package.json`;
- actualizar `.github/workflows/ci.yml`;
- actualizar `docs/runbooks/local-development.md`;
- actualizar `supabase/README.md` y los README de sus subdirectorios.

Agregar `check:database` para ejecutar, con Supabase ya iniciado:

1. `db:reset`;
2. `db:lint`;
3. `db:advisors`;
4. `db:test`;
5. `db:types:check`.

CI tendrá un trabajo de base separado del trabajo TypeScript. Iniciará Supabase, ejecutará
`check:database` y lo detendrá en un paso `always()`. No usará secretos ni proyectos enlazados.

El runbook explicará:

- inicio, estado y URLs locales;
- reconstrucción destructiva limitada al ambiente local;
- pruebas y advisors;
- regeneración de tipos;
- parada conservando datos;
- resolución del caso Docker no disponible;
- prohibición explícita de usar flags `--linked` en desarrollo cotidiano.

Commit previsto:

```text
ci(database): verify local Supabase schema
```

### Etapa 9: cierre y documentación

Archivos:

- actualizar `README.md`;
- actualizar `docs/README.md` si cambia el orden de lectura;
- actualizar el diseño y este plan a estado `implementado`;
- actualizar `supabase/README.md` con el contrato realmente construido.

Registrar:

- nombres reales de las migraciones generadas;
- cantidad final de pruebas pgTAP;
- resultado de lint y advisors;
- ubicación del contrato TypeScript;
- cualquier refinamiento respecto al diseño;
- comandos exactos aprobados.

Verificación final:

```bash
pnpm check
pnpm check:database
git diff --check
git status --short --branch
```

Commit previsto:

```text
docs(database): document local catalog workflow
```

## 10. Estrategia de pruebas

### Pruebas de estructura

Usar pgTAP para comprobar tablas, columnas, tipos, claves, checks, índices y RLS habilitada. Las
pruebas no dependerán de inspección manual en Studio.

### Pruebas de restricciones

Cada regla crítica tendrá al menos un caso válido y otro inválido. Las inserciones de prueba se
ejecutarán dentro de la transacción aislada de pgTAP y no modificarán el seed.

### Pruebas de RLS

Preparar fixtures como rol propietario, cambiar con `set local role anon` o `authenticated` y
comprobar resultados y errores efectivos. No basta con verificar que una política exista en el
catálogo del sistema.

### Pruebas del seed

El seed se valida indirectamente después de `db reset` mediante conteos y relaciones conocidas. Sus
UUID permiten consultas deterministas sin depender del orden físico.

### Pruebas de tipos

La salida de `supabase gen types --local --schema public` se compara byte por byte después de
normalizar finales de línea. Una diferencia obliga a regenerar y revisar el contrato versionado.

## 11. Seguridad

- RLS en cada tabla de `public` desde la migración que la crea.
- Grants explícitos separados de políticas.
- Ninguna escritura pública.
- Ningún `service_role`, contraseña o token en Git.
- Ninguna autorización basada en `user_metadata`.
- Ninguna vista o función pública privilegiada.
- `private` no se agrega a los esquemas expuestos por Data API.
- Funciones con `search_path` fijo y permisos revisados.
- Pruebas negativas para acceso y relaciones multimarcas.
- Advisors de seguridad y rendimiento ejecutados antes del cierre.

El cambio de Supabase que hace optativa la exposición automática de tablas se considera desde el
inicio: cada grant necesario vivirá en la migración y no dependerá del valor predeterminado del
proyecto.

## 12. Rendimiento

- Indexar claves foráneas y columnas usadas por RLS.
- Colocar columnas de igualdad antes de orden o rango en índices compuestos.
- Evitar índices duplicados que ya estén cubiertos por una PK o unicidad.
- No usar JSONB para entidades relacionales del catálogo.
- No añadir particiones, materializaciones o búsqueda de texto en esta fase.
- Revisar advisors y justificar cualquier advertencia que no se corrija.

El volumen inicial será pequeño, pero las decisiones de aislamiento y claves deben ser correctas
antes de agregar pedidos.

## 13. Riesgos y controles

### Docker no está iniciado

Control: comprobar `docker info` al inicio. No seguir con migraciones que no puedan probarse.

### La CLI genera configuración nueva o cambiante

Control: usar la versión fijada, descubrir comandos con `--help` y revisar completamente
`config.toml` antes de versionarlo.

### RLS parece correcta pero filtra de más o de menos

Control: ejecutar consultas positivas y negativas bajo los roles reales, incluyendo padres inactivos
y marcas diferentes.

### Una clave foránea permite cruces de marca

Control: usar FKs compuestas y tener una prueba negativa por cada familia de relación.

### Los tipos quedan desactualizados

Control: versionar la salida y ejecutar `db:types:check` en CI.

### Storage expone escrituras

Control: bucket público solo para lectura, sin políticas de escritura, y prueba anónima de rechazo.

### El seed empieza a representar producción

Control: conservar nombres ficticios, UUID deterministas y ausencia total de datos personales.

### La verificación local se confunde con una promoción

Control: no enlazar proyectos remotos y documentar que staging y producción requieren otra fase.

## 14. Criterios de finalización

La implementación estará terminada cuando:

- `supabase/config.toml` sea reproducible y no contenga secretos;
- existan exactamente las doce tablas aprobadas para esta etapa;
- las cuatro migraciones se apliquen desde cero en orden;
- el seed sintético se cargue después de las migraciones;
- las restricciones impidan cruces de marca y valores inválidos;
- `anon` y `authenticated` lean únicamente catálogo activo;
- esos roles no puedan escribir;
- el bucket `catalog` sea público y tenga límites explícitos;
- todas las pruebas pgTAP aprueben;
- lint y advisors locales no reporten errores pendientes;
- los tipos TypeScript coincidan con el esquema local;
- CI ejecute la verificación sin credenciales remotas;
- `pnpm check` y `pnpm check:database` aprueben;
- documentación y estado de Git estén limpios.

## 15. No objetivos

- Conectar Supabase desde `apps/web`.
- Instalar `@supabase/supabase-js` o `@supabase/ssr`.
- Crear adaptadores de lectura o escritura.
- Diseñar usuarios internos y autorización administrativa.
- Persistir carritos o datos del checkout.
- Crear pedidos, pagos, FEL, entrega u outbox.
- Importar el menú real de V1.
- Subir imágenes reales.
- Enlazar o desplegar proyectos remotos.

## 16. Siguiente cambio después de este plan

Una vez implementado y verificado Supabase local, diseñar el adaptador de lectura del catálogo desde
`apps/web`. La conexión de Next.js no comenzará hasta tener estable el contrato generado y la
proyección pública protegida por RLS.

## 17. Referencias verificadas

- [Supabase: flujo de desarrollo local](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase: seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: cambio de exposición explícita](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Supabase: migraciones](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase: seed](https://supabase.com/docs/guides/local-development/seeding-your-database)
- [Supabase: pruebas pgTAP](https://supabase.com/docs/guides/local-development/testing/overview)
