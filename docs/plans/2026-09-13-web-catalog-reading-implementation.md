# Plan de implementación de lectura del catálogo en la web

- Estado: listo para ejecutar
- Fecha: 2026-09-13
- Diseño relacionado: `2026-09-13-web-catalog-reading-design.md`
- Alcance: primera lectura vertical de catálogo desde Supabase local hasta `apps/web`
- SDK verificado al redactar el plan: `@supabase/supabase-js` `2.116.0`
- Framework actual: Next.js `16.3.5`, React `19.2.8`, Node.js `24.21.x`

## 1. Resultado esperado

Al terminar, la página inicial de `apps/web` leerá el catálogo público de `bbqbros` para la sede
sintética `sucursal-demo-norte`, aplicará las reglas de disponibilidad de `@bbqbros/domain` y
mostrará únicamente categorías con productos vendibles.

El recorrido será real y comprobable:

```text
HomePage
  -> servicio cacheado por marca y sede
  -> puerto CatalogRepository
  -> adaptador tipado de Supabase
  -> Data API con llave publicable y rol anon
  -> RLS
  -> mapper y reglas del dominio
  -> CatalogSnapshot
  -> componentes del catálogo
```

Esta entrega no implementará carrito, configurador de modificadores, cobertura, checkout, datos
reales ni diseño visual definitivo.

## 2. Reglas de ejecución

- Trabajar sobre `main` de V2 y mantener V1 completamente intacta.
- Implementar una etapa a la vez, revisarla y crear un commit pequeño antes de continuar.
- Escribir primero la prueba que describe cada comportamiento cuando la unidad sea comprobable.
- Mantener todo acceso a Supabase en módulos de servidor.
- Usar únicamente `SUPABASE_PUBLISHABLE_KEY`; no introducir llaves `secret`, `service_role` o
  variables `NEXT_PUBLIC_*`.
- Conservar RLS como frontera efectiva aunque la consulta se ejecute desde un Server Component.
- No consultar Supabase durante `next build` ni exigir variables de entorno para ejecutar el build.
- No devolver filas generadas, nombres `snake_case` o errores de PostgREST a los componentes.
- No ocultar un fallo técnico presentándolo como catálogo vacío.
- No agregar tolerancia parcial: si una consulta requerida falla, falla la lectura completa.
- Fijar versiones exactas y conservar el lockfile.
- Ejecutar la integración únicamente contra Supabase local reconstruido.
- No conectar, enlazar, migrar ni escribir en proyectos remotos.
- No hacer push sin una solicitud explícita del usuario.

## 3. Decisiones técnicas cerradas

### 3.1 Cliente y seguridad

Se instalarán versiones exactas:

```text
@supabase/supabase-js  2.116.0
server-only            0.0.1
@bbqbros/contracts     workspace:*
@bbqbros/domain        workspace:*
```

No se instalará `@supabase/ssr` porque esta fase no usa autenticación, cookies ni sesiones. El
cliente se creará con `Database` de `@bbqbros/contracts` y con persistencia de sesión, renovación de
token y detección de sesión desactivadas.

El uso de una llave publicable es deliberado. Supabase la asigna al rol PostgreSQL `anon` cuando no
existe una sesión de usuario; por tanto, la lectura seguirá limitada por los grants y políticas RLS
ya probados.

### 3.2 Modelo y fronteras

Los componentes solo conocerán `CatalogReadResult` y `CatalogSnapshot`. El SDK, `Database`, las
tablas, las columnas y los errores de PostgREST quedarán dentro del adaptador de Supabase.

Para conservar esa frontera, el repositorio traducirá las filas a un `CatalogSource` interno en
camelCase. El mapper recibirá ese origen neutral y producirá el snapshot mediante las funciones de
`@bbqbros/domain`.

```text
filas Database -> CatalogSource -> CatalogSnapshot -> React
```

### 3.3 Ejecución y caché

La página tendrá un límite `Suspense`. Su contenido dinámico llamará `connection()` antes de leer la
configuración, con lo cual Next.js podrá construir la aplicación sin Supabase disponible. La función
de datos usará el mecanismo estable de Next.js 16:

```text
use cache
cacheLife("catalog")
cacheTag("catalog:<brandSlug>:<locationSlug>")
```

El perfil `catalog` se definirá con:

| Propiedad    | Segundos | Efecto                                                   |
| ------------ | -------- | -------------------------------------------------------- |
| `stale`      | 60       | reutilización en navegación del cliente                  |
| `revalidate` | 60       | actualización del valor del servidor después de 1 minuto |
| `expire`     | 120      | límite antes de exigir una lectura nueva                 |

Esta fase no implementará invalidación activa porque todavía no existe publicación administrativa.

### 3.4 Imágenes

`image_path` seguirá siendo una ruta relativa al bucket público `catalog`. El adaptador resolverá la
URL mediante `storage.from("catalog").getPublicUrl(...)`. `next/image` aceptará únicamente el origen
de `SUPABASE_URL` y la ruta `/storage/v1/object/public/catalog/**`; no se abrirá un patrón remoto
global.

Cuando no exista `image_path`, el modelo producirá una variante `placeholder`. El componente
mostrará un bloque gráfico con la paleta y tipografía de BBQBROS, sin fotografía genérica.

## 4. Árbol objetivo

```text
apps/web/
├── .env.example
├── README.md
├── next.config.ts
├── package.json
├── vitest.config.mts
├── vitest.integration.config.mts
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── page.test.tsx
    │   └── page.tsx
    ├── test/
    │   └── server-only.ts
    └── features/catalog/
        ├── components/
        │   ├── catalog-content.test.tsx
        │   ├── catalog-content.tsx
        │   ├── catalog-section.tsx
        │   ├── catalog-state.tsx
        │   ├── price.tsx
        │   ├── product-card.test.tsx
        │   └── product-card.tsx
        ├── model/
        │   ├── catalog-read-result.ts
        │   └── catalog-snapshot.ts
        └── server/
            ├── cached-catalog.ts
            ├── catalog-environment.test.ts
            ├── catalog-environment.ts
            ├── catalog-mapper.test.ts
            ├── catalog-mapper.ts
            ├── catalog-repository.ts
            ├── catalog-service.test.ts
            ├── catalog-service.ts
            ├── catalog-source.ts
            ├── create-catalog-service.ts
            ├── local-supabase.test-support.ts
            ├── supabase-catalog-repository.integration.test.ts
            ├── supabase-catalog-repository.ts
            └── supabase-client.ts
docs/
├── README.md
├── plans/
│   ├── 2026-09-13-web-catalog-reading-design.md
│   └── 2026-09-13-web-catalog-reading-implementation.md
└── runbooks/local-development.md
.github/workflows/ci.yml
pnpm-lock.yaml
```

Los nombres pueden ajustarse mínimamente si una frontera queda más clara durante la implementación,
pero no se fusionarán infraestructura, negocio y presentación en un mismo archivo.

## 5. Contratos previstos

### 5.1 Resultado de lectura

```ts
type CatalogReadResult =
  | { status: "success"; snapshot: CatalogSnapshot }
  | { status: "empty"; brandName: string; locationName: string }
  | { status: "not_found" }
  | { status: "failure"; reference: string };
```

- `success`: existe al menos una categoría con un producto vendible.
- `empty`: marca y sede existen, pero no queda ningún producto vendible.
- `not_found`: marca o sede no son visibles para RLS o no existen.
- `failure`: configuración inválida, error de transporte, error de consulta o datos incoherentes.

La UI no distinguirá si `not_found` corresponde a marca, sede, registro inexistente o registro
oculto. `reference` será un identificador opaco para correlacionar el log del servidor; nunca
contendrá una llave, URL sensible, SQL o mensaje crudo de PostgREST.

### 5.2 Snapshot

```ts
type CatalogSnapshot = Readonly<{
  brand: Readonly<{
    id: string;
    slug: string;
    name: string;
    currencyCode: "GTQ";
  }>;
  location: Readonly<{
    id: string;
    slug: string;
    name: string;
  }>;
  categories: readonly CatalogCategory[];
}>;
```

Cada producto incluirá:

- identidad, slug, nombre y descripción opcional;
- `regularPriceCents` y `currentPriceCents` como enteros;
- `isOnOffer`;
- imagen pública o placeholder mediante unión discriminada;
- `isCustomizable` calculado desde los grupos aplicables y disponibles.

Todos los arreglos devueltos serán copias inmutables. Categorías y productos se ordenarán por
`displayOrder` y, como desempate estable, por nombre e identificador.

### 5.3 Puerto de persistencia

```ts
interface CatalogRepository {
  load(brandSlug: string, locationSlug: string): Promise<CatalogRepositoryResult>;
}
```

`CatalogRepositoryResult` distinguirá `found`, `not_found` y `failure`. `found` contendrá un
`CatalogSource` con primitivas validadas estructuralmente y nombres camelCase. El puerto no
importará Supabase ni `Database`.

## 6. Consultas previstas

El adaptador realizará primero dos consultas secuenciales:

1. `brands`: `id, name, slug, currency_code` por slug.
2. `locations`: `id, brand_id, name, slug` por marca y slug.

Si una devuelve cero filas, finalizará con `not_found`. No se usará `.single()` sobre una respuesta
que pueda estar vacía; se elegirá una forma que diferencie ausencia de error sin convertirla en
excepción técnica.

Después consultará en paralelo, siempre con columnas explícitas y filtros de marca o sede:

1. `categories`;
2. `products`;
3. `modifier_groups`;
4. `modifier_options`;
5. `category_modifier_groups`;
6. `category_modifier_group_exclusions`;
7. `product_modifier_groups`;
8. `modifier_conditions`;
9. `location_products`;
10. `location_modifier_options`.

No se usará `select("*")`. Las políticas ya ocultan registros inactivos y relaciones no públicas;
los filtros explícitos reducen volumen y hacen visible la intención. Un error en cualquiera de las
diez respuestas cancela el mapeo y produce `failure`.

## 7. Traducción y reglas del dominio

El mapper seguirá este orden:

1. Normalizar texto opcional sin convertir una descripción ausente en cadena vacía.
2. Convertir UUID a identificadores con `createIdentifier`.
3. Convertir centavos con `createMoney` y `createPriceAdjustment`.
4. Validar precio normal/oferta con `createProductPrice` y obtener el efectivo con
   `getEffectivePrice`.
5. Crear opciones y grupos con `createModifierOption` y `createModifierGroup`.
6. Construir y validar condiciones con `validateModifierConditions`.
7. Resolver herencia, asignaciones directas y exclusiones con `resolveModifierGroupsForProduct`.
8. Calcular disponibilidad en la sede con `resolveProductAvailability` y selecciones vacías.
9. Excluir productos cuyo resultado no sea vendible.
10. Eliminar categorías sin productos y ordenar el resultado.

`isCustomizable` será verdadero cuando el resultado de disponibilidad tenga al menos un grupo activo
con opciones disponibles. Un grupo hijo condicional no se contará antes de que se active.

Si el dominio rechaza una fila o una relación, no se ignorará silenciosamente. El servicio devolverá
`failure`, registrará la causa únicamente en el servidor y evitará servir un catálogo posiblemente
incorrecto.

## 8. Plan por etapas

### Etapa 1: fijar dependencias y fronteras del paquete web

Estado de ejecución: completada y verificada el 2026-09-13.

Archivos:

- actualizar `apps/web/package.json`;
- actualizar `pnpm-lock.yaml`.

Acciones:

1. Agregar `@supabase/supabase-js@2.116.0` y `server-only@0.0.1` como dependencias exactas.
2. Agregar `@bbqbros/contracts@workspace:*` y `@bbqbros/domain@workspace:*`.
3. Confirmar que no se instala `@supabase/ssr` ni otro SDK duplicado.
4. Revisar el diff del lockfile para detectar dependencias inesperadas.

Verificación:

```bash
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web build
```

Commit previsto:

```text
chore(web): add typed Supabase dependencies
```

### Etapa 2: validar configuración y crear el cliente de servidor

Estado de ejecución: completada y verificada el 2026-09-13.

Archivos:

- crear `apps/web/.env.example`;
- crear `apps/web/src/features/catalog/server/catalog-environment.ts`;
- crear `apps/web/src/features/catalog/server/catalog-environment.test.ts`;
- crear `apps/web/src/features/catalog/server/supabase-client.ts`;
- crear `apps/web/src/test/server-only.ts`;
- actualizar `apps/web/vitest.config.mts`;
- actualizar `apps/web/README.md`.

Pruebas escritas primero:

- acepta URL HTTP local y HTTPS remota;
- acepta únicamente una llave con prefijo `sb_publishable_`;
- rechaza URL ausente o inválida;
- rechaza slugs vacíos o fuera del patrón del esquema;
- rechaza llaves `sb_secret_`, JWT heredados y cualquier otro formato;
- no incluye valores de entorno en mensajes de error.

Acciones:

1. Crear un lector perezoso que reciba `NodeJS.ProcessEnv` para poder probarlo sin mutar el proceso.
2. Exigir `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CATALOG_BRAND_SLUG` y `CATALOG_LOCATION_SLUG`
   solo cuando se ejecuta la lectura.
3. Añadir `import "server-only"` a los puntos de entrada de infraestructura.
4. Crear `SupabaseClient<Database>` sin persistencia/renovación de sesión y sin iniciar
   suscripciones Realtime.
5. Documentar `bbqbros` y `sucursal-demo-norte` como slugs exclusivamente locales.
6. Mantener `.env.local` ignorado y versionar solo valores ficticios en `.env.example`.
7. Resolver `server-only` a un módulo vacío únicamente dentro de Vitest; el build real conservará el
   marcador y fallará si un Client Component intenta importar infraestructura.

Verificación:

```bash
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web build
pnpm check:secrets
```

El build debe aprobar sin crear `.env.local`.

Commit previsto:

```text
feat(web): configure server catalog client
```

### Etapa 3: definir el modelo de lectura y el puerto

Estado de ejecución: pendiente.

Archivos:

- crear `apps/web/src/features/catalog/model/catalog-snapshot.ts`;
- crear `apps/web/src/features/catalog/model/catalog-read-result.ts`;
- crear `apps/web/src/features/catalog/server/catalog-source.ts`;
- crear `apps/web/src/features/catalog/server/catalog-repository.ts`.

Acciones:

1. Definir tipos inmutables y uniones discriminadas exhaustivas.
2. Mantener importes en centavos, sin strings monetarios en el modelo.
3. Mantener el path de Storage fuera del snapshot final.
4. Definir errores internos estables sin exponer el SDK.
5. Evitar clases mutables y getters con efectos laterales.

Verificación:

```bash
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
```

Commit previsto:

```text
feat(web): define catalog read model
```

### Etapa 4: implementar el adaptador tipado de Supabase

Estado de ejecución: pendiente.

Archivos:

- crear `apps/web/src/features/catalog/server/supabase-catalog-repository.ts`;
- crear fixtures unitarios solo si son necesarios para probar la traducción de respuestas.

Acciones:

1. Inyectar el cliente tipado para que el adaptador sea comprobable y no dependa de un singleton.
2. Buscar marca y sede antes de lanzar el resto de consultas.
3. Seleccionar únicamente las columnas enumeradas en la sección 6.
4. Aplicar filtros explícitos de marca, categoría, sede y actividad donde corresponda.
5. Ejecutar en paralelo solo las diez consultas independientes posteriores.
6. Convertir filas a `CatalogSource` en camelCase.
7. Resolver URLs públicas de Storage sin realizar una consulta privilegiada.
8. Traducir cero filas de marca o sede a `not_found`.
9. Traducir cualquier error de PostgREST a un error interno sanitizado.

Pruebas de contrato estático durante la etapa:

- TypeScript rechaza nombres de tabla o columnas que no existen en `Database`;
- el puerto no importa `@supabase/supabase-js` ni `@bbqbros/contracts`;
- ninguna consulta usa una llave secreta o un bypass de RLS.

La prueba real del adaptador se agregará en la etapa 8, después de que mapper y servicio puedan
validar el recorrido completo.

Verificación:

```bash
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web test
```

Commit previsto:

```text
feat(web): query public catalog from Supabase
```

### Etapa 5: mapear catálogo y aplicar disponibilidad

Estado de ejecución: pendiente.

Archivos:

- crear `apps/web/src/features/catalog/server/catalog-mapper.ts`;
- crear `apps/web/src/features/catalog/server/catalog-mapper.test.ts`.

Pruebas escritas primero:

- precio normal y precio de oferta;
- orden por `displayOrder` con desempate estable;
- descripción opcional e imagen ausente;
- grupo heredado de categoría;
- exclusión de categoría y reasignación directa al producto;
- grupo condicional inactivo con selecciones vacías;
- opción inactiva o no disponible;
- producto no habilitado en la sede;
- grupo obligatorio sin suficientes opciones;
- categoría sin productos vendibles;
- datos monetarios, identificadores, condiciones o relaciones inválidos.

Acciones:

1. Crear fixtures mínimos legibles; no copiar el seed SQL completo a TypeScript.
2. Encapsular la extracción de `Result` del dominio para conservar la causa interna.
3. Construir el grafo de condiciones una vez por catálogo.
4. Resolver grupos y disponibilidad por producto.
5. Producir `CatalogSnapshot` únicamente con productos vendibles.
6. Congelar/copiar arreglos en los límites públicos.

Verificación:

```bash
pnpm --filter @bbqbros/web test -- catalog-mapper
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
```

Commit previsto:

```text
feat(web): map effective catalog availability
```

### Etapa 6: componer el servicio y la caché

Estado de ejecución: pendiente.

Archivos:

- crear `apps/web/src/features/catalog/server/catalog-service.ts`;
- crear `apps/web/src/features/catalog/server/catalog-service.test.ts`;
- crear `apps/web/src/features/catalog/server/create-catalog-service.ts`;
- crear `apps/web/src/features/catalog/server/cached-catalog.ts`;
- actualizar `apps/web/next.config.ts`.

Pruebas escritas primero para el servicio sin caché:

- `found` con productos produce `success`;
- `found` sin productos produce `empty`;
- ausencia de marca o sede produce `not_found`;
- error de repositorio produce `failure`;
- error del mapper produce `failure`;
- el error público no contiene detalles internos.

Acciones:

1. Inyectar `CatalogRepository` y logger en el servicio no cacheado.
2. Generar una referencia de fallo opaca y registrar la causa en servidor.
3. Crear la composición real configuración -> cliente -> repositorio -> servicio.
4. Habilitar `cacheComponents` y el perfil `catalog` en `next.config.ts`.
5. Crear `getCachedCatalog(brandSlug, locationSlug)` con argumentos serializables.
6. Etiquetar cada entrada por marca y sede.
7. Configurar `remotePatterns` con el origen exacto de Supabase y el path del bucket. Si la variable
   no existe durante un build local, admitir solo el origen local `127.0.0.1:54321`; los builds de
   staging y producción deberán recibir su `SUPABASE_URL` durante la compilación.

No se intentará probar internamente el almacenamiento de caché de Next.js con mocks frágiles. La
prueba unitaria cubrirá el servicio puro; `next build` verificará que la directiva y configuración
son válidas para la versión instalada.

Verificación:

```bash
pnpm --filter @bbqbros/web test -- catalog-service
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web build
```

Commit previsto:

```text
feat(web): cache catalog reads by location
```

### Etapa 7: presentar el catálogo y sus estados

Estado de ejecución: pendiente.

Archivos:

- crear los componentes enumerados en `features/catalog/components/`;
- actualizar `apps/web/src/app/page.tsx`;
- actualizar `apps/web/src/app/page.test.tsx`;
- actualizar `apps/web/src/app/globals.css` solo para estilos globales realmente compartidos.

Pruebas escritas primero:

- una tarjeta muestra nombre, descripción opcional y precio actual;
- una oferta muestra precio actual y precio normal tachado de forma accesible;
- un producto con grupos disponibles muestra `Personalizable`;
- el placeholder de marca aparece sin imagen;
- categorías usan encabezados semánticos y productos una lista;
- `empty`, `not_found` y `failure` tienen textos y acciones distintos;
- no se muestra información técnica ni una llave en ningún estado;
- el fallback de `Suspense` comunica que el menú se está cargando.

Acciones:

1. Mantener `HomePage` como Server Component.
2. Colocar `connection()` en el contenido dinámico, antes de leer el entorno.
3. Pasar marca y sede explícitas a `getCachedCatalog`.
4. Renderizar resultados mediante una comprobación exhaustiva de `status`.
5. Formatear GTQ con `Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" })`.
6. Usar `next/image` con dimensiones o relación de aspecto estable.
7. Aplicar la jerarquía tipográfica ya aprobada: Brookline para marca y Besley para titulares.
8. Mantener la composición mobile-first, foco visible, contraste y regiones semánticas.
9. No agregar botones de comprar o personalizar que todavía no funcionen.

El estado `failure` ofrecerá reintentar recargando la página; `not_found` explicará que el menú no
está disponible para esa ubicación configurada; `empty` comunicará que no hay productos disponibles
en ese momento.

Verificación:

```bash
pnpm --filter @bbqbros/web test
pnpm --filter @bbqbros/web lint
pnpm --filter @bbqbros/web typecheck
pnpm --filter @bbqbros/web build
```

Commit previsto:

```text
feat(web): render public delivery catalog
```

### Etapa 8: probar el recorrido contra Supabase local

Estado de ejecución: pendiente.

Archivos:

- crear `apps/web/vitest.integration.config.mts`;
- crear `apps/web/src/features/catalog/server/local-supabase.test-support.ts`;
- crear `apps/web/src/features/catalog/server/supabase-catalog-repository.integration.test.ts`;
- actualizar `apps/web/vitest.config.mts`;
- actualizar `apps/web/package.json`;
- actualizar `.github/workflows/ci.yml`.

Acciones:

1. Excluir `*.integration.test.ts` del comando unitario normal.
2. Crear una configuración Node y un comando `test:integration` que incluya únicamente esas pruebas.
3. Obtener URL y llave publicable local mediante `supabase status -o json --agent no` dentro del
   soporte de prueba, sin imprimir el JSON ni guardarlo en fixtures.
4. Reutilizar la CLI versionada del monorepo, no una instalación global.
5. Crear el cliente real con la llave publicable.
6. Ejecutar el repositorio y servicio contra el seed reconstruido.
7. Agregar la prueba al job `database` de CI después de `pnpm check:database` y antes de detener
   Supabase.

Casos de integración obligatorios:

- `bbqbros` + `sucursal-demo-norte` devuelve `success`;
- devuelve exactamente la categoría pública `Combos de Prueba`;
- devuelve `Combo Clásico Demo` y `Combo Oferta Demo` en ese orden;
- la oferta efectiva es `6990` centavos frente a `8000` regulares;
- no aparecen productos o categorías inactivas;
- no aparecen relaciones de disponibilidad con `is_available = false`;
- marca desconocida produce `not_found`;
- sede desconocida produce `not_found`;
- el recorrido funciona sin llave secreta y, por tanto, demuestra el paso por RLS.

Verificación local:

```bash
pnpm db:start
pnpm check:database
pnpm --filter @bbqbros/web test:integration
```

Commit previsto:

```text
test(web): verify catalog against local Supabase
```

### Etapa 9: documentar operación y validar la entrega completa

Estado de ejecución: pendiente.

Archivos:

- actualizar `apps/web/README.md`;
- actualizar `docs/runbooks/local-development.md`;
- actualizar este plan y el diseño relacionado a estado implementado.

Acciones:

1. Documentar cómo iniciar Supabase y reconstruir el seed.
2. Documentar cómo obtener únicamente URL y llave publicable para `.env.local`.
3. Documentar los cuatro nombres de variables sin versionar valores reales.
4. Documentar cómo iniciar la web y qué catálogo sintético debe observarse.
5. Abrir la página con Supabase local y comprobar visualmente móvil y escritorio.
6. Verificar los cuatro estados con datos controlados o tests, sin alterar permanentemente el seed.
7. Confirmar que el build sigue funcionando sin variables ni base activa.
8. Actualizar estados y fecha de implementación solo después de aprobar todas las verificaciones.

Matriz final:

| Comprobación            | Entorno                       | Criterio                              |
| ----------------------- | ----------------------------- | ------------------------------------- |
| unitarias y componentes | sin Supabase                  | todas aprueban                        |
| build                   | sin variables ni Supabase     | aprueba sin consultar la base         |
| base, RLS y contrato    | Supabase local reconstruido   | `check:database` aprueba              |
| integración web         | URL y llave publicable local  | catálogo y negativos aprueban         |
| inspección visual       | servidor web + Supabase local | móvil/escritorio sin errores visibles |
| seguridad               | repositorio completo          | `check:secrets` aprueba               |
| calidad monorepo        | repositorio completo          | `pnpm check` aprueba                  |

Comandos finales:

```bash
pnpm check
pnpm check:database
pnpm --filter @bbqbros/web test:integration
git status --short --branch
```

Commit previsto:

```text
docs(web): document local catalog reading
```

## 9. Criterios de aceptación

La fase se considerará completada solo cuando:

- el catálogo visible provenga de Supabase local y no de fixtures en la página;
- la consulta use `Database` y una llave publicable;
- RLS oculte registros inactivos y no exista un bypass privilegiado;
- marca y sede lleguen como argumentos explícitos hasta el repositorio;
- el mapper use las reglas existentes de `@bbqbros/domain`;
- solo se muestren productos efectivamente vendibles en la sede;
- precio normal, oferta, personalización e imagen/placeholder se representen correctamente;
- vacío, no encontrado y fallo técnico sean distinguibles;
- la caché tenga el perfil aprobado y una etiqueta por marca/sede;
- `next build` apruebe sin entorno local ni conexión de datos;
- pruebas unitarias, de componentes, base e integración aprueben;
- la página sea revisada visualmente en móvil y escritorio;
- documentación y estados reflejen exactamente lo implementado;
- el árbol quede limpio salvo por commits locales todavía no enviados.

## 10. Riesgos y controles

| Riesgo                                           | Control previsto                                            |
| ------------------------------------------------ | ----------------------------------------------------------- |
| filtrar una llave privilegiada                   | solo variable publishable, rechazo de `sb_secret_`, secrets |
| depender accidentalmente de Supabase en build    | `connection()`, config perezosa y build sin entorno         |
| acoplar React al esquema                         | `CatalogSnapshot` y `CatalogSource` propios                 |
| omitir reglas complejas                          | reutilizar dominio y cubrir herencia/condiciones en tests   |
| servir catálogo parcial                          | fallo total si cualquier consulta requerida falla           |
| confundir ausencia con avería                    | unión discriminada de cuatro estados                        |
| abrir el optimizador de imágenes a cualquier URL | `remotePatterns` exacto para origen y bucket                |
| volver lentas las pruebas unitarias              | suite de integración separada                               |
| CI consultar un proyecto remoto                  | URL/llave obtenidas de `supabase status` local              |
| introducir interfaz definitiva antes de tiempo   | componentes mínimos, sin acciones de compra falsas          |

## 11. Asuntos expresamente diferidos

- La sede fija se reemplazará con el servicio de cobertura antes del lanzamiento real.
- Las fotos y datos reales se cargarán por un flujo editorial posterior.
- La invalidación inmediata del catálogo se diseñará junto al panel administrativo.
- El configurador consumirá el detalle de grupos/opciones en una fase distinta.
- Carrito y checkout reutilizarán el snapshot y volverán a validar disponibilidad.
- Staging y producción se configurarán después de cerrar esta integración local.
- Playwright se incorporará cuando exista un recorrido interactivo estable que justifique E2E.

## 12. Referencias técnicas verificadas

- [Supabase: llaves API](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase JavaScript: soporte TypeScript](https://supabase.com/docs/reference/javascript/typescript-support)
- [Supabase con Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Next.js: Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Next.js: `use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Next.js: `cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [Next.js: `next/image`](https://nextjs.org/docs/app/api-reference/components/image)
