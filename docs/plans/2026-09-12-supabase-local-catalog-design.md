# Diseño de Supabase local para catálogo

- Estado: aprobado
- Fecha: 2026-09-12
- Alcance: persistencia local del catálogo multimarcas y multisedes
- Implementación: pendiente
- Decisiones relacionadas: ADR-0003 y ADR-0004

## 1. Objetivo

Crear una base local de Supabase reproducible que persista el catálogo definido por
`packages/domain`, aplique integridad multimarcas desde PostgreSQL y exponga únicamente la lectura
pública necesaria para la tienda.

Esta etapa establece configuración, migraciones, datos sintéticos, Storage, permisos, RLS, pruebas y
generación de tipos. No conecta staging o producción y no importa información desde V1.

## 2. Límites de la etapa

### Incluido

- Supabase local ejecutado mediante la dependencia fijada en el repositorio.
- Configuración versionada en `supabase/config.toml`.
- Migraciones SQL como única fuente de verdad del esquema.
- Catálogo multimarcas y multisedes.
- Disponibilidad de productos y opciones por sede.
- Imagen principal opcional por producto mediante Supabase Storage.
- Lectura pública de catálogo activo mediante permisos explícitos y RLS.
- Seed sintético con identificadores deterministas.
- Pruebas pgTAP de estructura, integridad, permisos, RLS y Storage.
- Tipos TypeScript generados desde la base local.

### Fuera de alcance

- Carritos persistidos o sincronizados.
- Clientes, direcciones, checkout y pedidos.
- Usuarios internos, membresías, roles y políticas administrativas.
- Pagos, FEL, entrega, GoNau, WhatsApp y outbox.
- Datos reales o personales de V1.
- Conexión, enlace o despliegue a staging o producción.
- Traducciones, variantes, inventario por cantidad, galerías y promociones avanzadas.

## 3. Responsabilidades

Supabase persiste datos, impide relaciones inválidas, aplica permisos y ofrece una proyección segura
para lectura. No reemplaza las reglas puras de `packages/domain`.

PostgreSQL hará cumplir reglas locales y relacionales: claves, unicidad, pertenencia a la misma
marca, precios válidos, rangos de selección y estados permitidos. Las reglas que requieren evaluar
un conjunto o grafo completo, como ciclos entre grupos o suficiencia de opciones activas,
continuarán validadas por el dominio antes de persistir cambios.

```text
Next.js
   │
   ├── lectura pública limitada ──> Data API + RLS
   │
   └── adaptador de persistencia ─> PostgreSQL
                                      │
packages/domain <── traducción ──────┘
```

La llave `service_role` no llegará al navegador. No se crearán políticas administrativas antes de
diseñar autenticación y membresías internas.

## 4. Convenciones del esquema

- Identificadores principales: `uuid`.
- Identificadores del seed: UUID fijos y conocidos.
- Nombres SQL: `snake_case` en minúsculas.
- Fechas: `timestamptz`.
- Importes: centavos enteros en `bigint`.
- Moneda del MVP: `GTQ`.
- Texto variable: `text` con restricciones cuando exista una regla real.
- Orden editorial: enteros no negativos.
- Activación editorial: `is_active`.
- Disponibilidad operativa: `is_available`.
- Eliminación cotidiana: no permitida; los elementos se desactivan.

Las tablas dependientes conservan `brand_id`. Cada padre expone una unicidad compuesta adecuada para
que las claves foráneas `(brand_id, resource_id)` impidan relaciones entre marcas distintas.

Los slugs son únicos dentro de una marca. No se exige unicidad global entre BBQBROS y marcas
futuras.

## 5. Modelo de datos

### `brands`

Raíz de aislamiento comercial.

- `id`
- `name`
- `slug`
- `currency_code`, restringido a `GTQ`
- `is_active`
- `created_at`
- `updated_at`

`slug` es único globalmente porque identifica la marca en rutas y objetos de Storage.

### `locations`

Sedes operativas de una marca.

- `id`
- `brand_id`
- `name`
- `slug`
- `is_active`
- `created_at`
- `updated_at`

La combinación `(brand_id, slug)` es única.

### `categories`

Categorías planas del menú.

- `id`
- `brand_id`
- `name`
- `slug`
- `description`, opcional
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

No existen subcategorías. La combinación `(brand_id, slug)` es única.

### `products`

Productos editoriales pertenecientes a una sola categoría.

- `id`
- `brand_id`
- `category_id`
- `name`
- `slug`
- `description`, opcional
- `regular_price_cents`
- `offer_price_cents`, opcional
- `image_path`, opcional
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

El precio normal debe ser mayor que cero. La oferta, cuando existe, debe ser mayor que cero y menor
que el precio normal. La combinación `(brand_id, slug)` es única.

### `modifier_groups`

Configuración reutilizable de una selección.

- `id`
- `brand_id`
- `name`
- `description`, opcional
- `selection_type`: `single` o `multiple`
- `min_selections`
- `max_selections`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

Los límites son enteros no negativos, `max_selections` es al menos uno y
`min_selections <= max_selections`. Un grupo `single` solo admite `0..1` o `1..1`.

### `modifier_options`

Opciones pertenecientes a un grupo de la misma marca.

- `id`
- `brand_id`
- `modifier_group_id`
- `name`
- `description`, opcional
- `price_adjustment_cents`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

El ajuste puede ser positivo, cero o negativo. El dominio impide que la configuración completa
produzca un precio unitario negativo.

### Asignaciones y condiciones

- `category_modifier_groups`: grupo heredado por una categoría.
- `category_modifier_group_exclusions`: producto que excluye un grupo heredado.
- `product_modifier_groups`: grupo asignado directamente a un producto.
- `modifier_conditions`: opción de un grupo padre que activa un grupo hijo.

Estas tablas utilizan claves primarias compuestas para impedir duplicados y claves foráneas
compuestas para conservar la marca. Una exclusión debe corresponder exactamente a una asignación de
categoría existente. Una opción activadora debe pertenecer al grupo padre declarado.

La base impide autorreferencias directas entre grupos. La validación completa de ciclos continúa en
`packages/domain`.

### Disponibilidad por sede

- `location_products`: relación entre sede y producto con `is_available`.
- `location_modifier_options`: relación entre sede y opción con `is_available`.

Solo una relación existente con `is_available = true` habilita el elemento. Una fila ausente o
marcada como falsa significa no disponible. La sede no puede modificar nombres, reglas o precios.

## 6. Imágenes y Storage

Se creará un bucket público llamado `catalog`. La lectura pública es apropiada porque las imágenes
del menú no contienen datos privados. Las escrituras anónimas permanecen prohibidas.

La ruta prevista es:

```text
<brand-slug>/products/<file-name>
```

`products.image_path` guarda únicamente la ruta relativa, nunca la URL del proyecto. Así local,
staging y producción pueden resolver la misma referencia con sus propias URLs.

El bucket aceptará solamente formatos de imagen aprobados y un tamaño máximo pequeño. La primera
migración no cargará archivos binarios ni copiará recursos de V1. Las cargas administrativas se
diseñarán con los usuarios internos.

Supabase Storage es la opción aprobada para el MVP. Un adaptador de medios permitirá evaluar otro
proveedor si aparecen galerías, video o necesidades avanzadas de transformación.

## 7. Data API, privilegios y RLS

Los privilegios y RLS son controles separados:

1. se revocan privilegios generales no necesarios;
2. se concede `SELECT` explícito a `anon` y `authenticated` solo sobre el catálogo público;
3. se habilita RLS en cada tabla expuesta;
4. se crean políticas específicas para filas visibles;
5. no se conceden escrituras públicas.

La lectura permite solamente:

- marcas activas;
- sedes y categorías activas de marcas activas;
- productos activos cuya categoría y marca estén activas;
- grupos y opciones activos de marcas activas;
- relaciones cuyos elementos vinculados estén activos;
- disponibilidad marcada como verdadera y perteneciente a elementos activos.

No se usa `auth.role()` dentro de las políticas. Las funciones estables de sesión, cuando sean
necesarias, se envolverán en `select` y las columnas consultadas por RLS tendrán índices adecuados.

`authenticated` obtiene en esta etapa la misma lectura pública que `anon`. No obtiene administración
por el simple hecho de iniciar sesión.

## 8. Índices

- Toda columna o conjunto de columnas que respalda una clave foránea tendrá un índice útil.
- Las claves compuestas comenzarán por `brand_id` cuando las consultas se delimiten por marca.
- Categorías y productos tendrán índices para lectura activa y orden editorial.
- La disponibilidad tendrá índices por sede y estado.
- Las políticas RLS no dependerán de búsquedas sin índice.

No se crearán índices especulativos para pedidos, búsqueda de texto o analítica. Los nuevos índices
deben corresponder a consultas o políticas concretas.

## 9. Seed local

`supabase/config.toml` configurará una ruta como `./seed/*.sql`. Los archivos se numerarán para
mantener un orden determinista.

El seed inicial contendrá:

- una marca BBQBROS activa;
- al menos dos sedes sintéticas;
- categorías y productos ficticios;
- un producto con oferta;
- grupos `single` y `multiple`;
- ajustes positivos, cero y negativos;
- asignación heredada, exclusión y asignación directa;
- una condición válida entre grupos;
- diferencias de disponibilidad entre sedes;
- registros inactivos para probar RLS.

El seed contiene solo inserciones y se ejecuta después de las migraciones. No incluye correos,
teléfonos, direcciones, secretos ni datos productivos.

## 10. Reconstrucción y comandos

La implementación agregará scripts pnpm con nombres explícitos para:

- iniciar Supabase local;
- consultar su estado;
- reconstruir la base local;
- ejecutar pruebas de base de datos;
- generar tipos TypeScript;
- detener el ambiente conservando sus volúmenes.

El criterio principal de reproducibilidad será una reconstrucción desde cero: aplicar todas las
migraciones, cargar el seed y ejecutar las pruebas sin intervención manual en Studio.

No se utilizarán comandos enlazados ni credenciales remotas en esta etapa.

## 11. Estrategia de pruebas

Las pruebas pgTAP se separarán por responsabilidad:

1. estructura, columnas, tipos, claves y RLS habilitada;
2. checks, unicidad e integridad multimarcas;
3. permisos y políticas bajo los roles `anon` y `authenticated`;
4. bucket, límites y ausencia de escritura anónima.

Entre los casos obligatorios estarán:

- aceptar un precio normal y una oferta válidos;
- rechazar ofertas iguales o superiores al precio normal;
- rechazar órdenes editoriales negativos;
- rechazar grupos `single` con límites incompatibles;
- rechazar productos, opciones y disponibilidad que crucen marcas;
- rechazar asignaciones y exclusiones duplicadas;
- leer productos activos como visitante;
- ocultar productos o padres inactivos;
- exponer solamente disponibilidad verdadera;
- rechazar `INSERT`, `UPDATE` y `DELETE` anónimos.

La generación de tipos y `pnpm check` completarán la verificación del monorepo. Una comprobación
local no se presentará como evidencia de staging o producción.

## 12. Manejo de fallos

- Una migración que no pueda aplicarse detiene la reconstrucción.
- Un seed incompatible con el esquema falla de forma visible.
- Una política sin prueba positiva y negativa no se considera terminada.
- Un cambio manual en Studio que no esté representado por migraciones se descarta al reconstruir.
- No se debilita una restricción o política para hacer pasar datos inválidos.

Cuando una regla no pueda expresarse limpiamente con una restricción declarativa, el dominio la
validará y el límite quedará documentado. No se añadirán triggers complejos sin una necesidad y una
estrategia de prueba claras.

## 13. Alternativas descartadas

### Esquema completo del MVP en una sola etapa

Incluir pedidos, usuarios, pagos, FEL y entrega produciría demasiadas decisiones simultáneas antes
de validar el primer adaptador de persistencia.

### Catálogo accesible solo mediante `service_role`

Obligaría a intermediar toda lectura y aumentaría el alcance de una credencial que omite RLS. El
catálogo activo es público y puede exponerse con permisos mínimos.

### Cloudinary desde el lanzamiento

Ofrece transformaciones avanzadas, pero introduce un proveedor y credenciales adicionales. El
volumen esperado del catálogo no lo justifica todavía.

### IDs secuenciales o identificadores dobles

Los UUID encajan con los identificadores nominales del dominio, evitan exponer secuencias y
facilitan datos deterministas e importaciones futuras.

### Borrado físico cotidiano

Desactivar elementos conserva referencias históricas futuras y evita romper pedidos cuando se
implemente su persistencia.

## 14. Criterios de aceptación del futuro plan

La implementación estará completa cuando:

- Supabase local pueda iniciarse con la versión fijada en el repositorio;
- la base se reconstruya únicamente desde migraciones y seed;
- las tablas reflejen el aislamiento por marca aprobado;
- los datos sintéticos puedan consultarse como visitante;
- los registros inactivos permanezcan ocultos;
- ninguna escritura pública sea posible;
- las relaciones cruzadas entre marcas sean rechazadas;
- las pruebas pgTAP, los tipos generados y `pnpm check` sean aprobados;
- los comandos y límites operativos estén documentados.

## 15. Plan de implementación

El plan detallado está documentado en
[`2026-09-12-supabase-local-catalog-implementation.md`](2026-09-12-supabase-local-catalog-implementation.md).
No se crearán migraciones antes de revisar y aprobar ese plan.

## 16. Referencias

- [Supabase: flujo de desarrollo local](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase: migraciones](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase: datos seed](https://supabase.com/docs/guides/local-development/seeding-your-database)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: pruebas locales](https://supabase.com/docs/guides/local-development/testing/overview)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
