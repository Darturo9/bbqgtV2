# Diseño de lectura del catálogo en la web

- Estado: aprobado
- Fecha: 2026-09-13
- Implementación: planificada en `2026-09-13-web-catalog-reading-implementation.md`
- Alcance: primera lectura vertical de catálogo desde `apps/web`
- Dependencias relacionadas: Supabase local, `@bbqbros/contracts` y `@bbqbros/domain`

## 1. Objetivo

Conectar la página pública de Next.js con el catálogo protegido de Supabase y demostrar el recorrido
completo desde persistencia hasta interfaz:

```text
Supabase local -> Data API + RLS -> adaptador -> reglas del dominio -> modelo de lectura -> página
```

La entrega mostrará categorías y productos disponibles para una sede sintética fija. Será una
integración mínima pero real: utilizará la base local, tipos generados, RLS y reglas existentes de
disponibilidad. No será todavía el diseño visual definitivo de la tienda.

## 2. Decisiones confirmadas

- Construir una lectura completa mínima, no solo infraestructura invisible.
- Mantener `bbqbros` como marca fija del lanzamiento.
- Usar temporalmente la sede `sucursal-demo-norte` del seed.
- Exigir siempre marca y sede como argumentos del servicio y repositorio.
- Sustituir la sede fija por el futuro servicio de cobertura, sin selector temporal.
- Consultar Supabase únicamente desde el servidor.
- Configurar URL y llave publicable mediante variables exclusivas del servidor.
- No usar llaves secretas, `service_role`, cookies ni autenticación.
- Traducir las filas a un modelo de lectura propio.
- Aplicar las reglas existentes de `packages/domain` para disponibilidad efectiva.
- Mantener caché temporal de 60 segundos.
- Mostrar un placeholder de marca cuando no exista imagen.
- Separar catálogo vacío, recurso inexistente y fallo técnico.
- Probar el adaptador contra Supabase local y los componentes con resultados controlados.

## 3. Alcance

### Incluido

- Dependencia fijada de `@supabase/supabase-js`.
- Validación de configuración del servidor.
- Cliente Supabase tipado mediante `Database`.
- Puerto `CatalogRepository` e implementación para Supabase.
- Consultas públicas delimitadas por marca y sede.
- Mapeo de persistencia al modelo `CatalogSnapshot`.
- Resolución de asignaciones, condiciones y disponibilidad con el dominio.
- Caché por marca y sede.
- Resolución de URLs públicas del bucket `catalog`.
- Página semántica con categorías y tarjetas de producto.
- Estados vacío, no encontrado y fallo técnico.
- Pruebas unitarias, de componentes y de integración local.
- Ejecución de la integración local en CI.

### Fuera de alcance

- Selector de sede o dirección.
- Cobertura geográfica y asignación automática de sede.
- Configurador de modificadores.
- Carrito, checkout y creación de pedidos.
- Autenticación o cuentas de cliente.
- Panel administrativo e invalidación por publicación.
- Lecturas desde el navegador.
- Datos reales, fotografías reales o conexión con V1.
- Supabase de staging o producción.
- Rediseño visual completo y pruebas E2E con Playwright.

## 4. Arquitectura

La funcionalidad permanecerá en `apps/web` porque todavía tiene un único consumidor. No se creará
otro paquete compartido anticipadamente.

```text
HomePage
   |
   v
getCachedCatalog(brandSlug, locationSlug)
   |
   v
CatalogRepository
   |
   v
SupabaseCatalogRepository
   |
   v
Data API publica + RLS
```

La organización conceptual será:

```text
apps/web/src/features/catalog/
  model/          Modelo de lectura y resultados
  server/         Configuración, cliente, repositorio, mapper, caché y composición
  components/     Presentación sin acceso a infraestructura
```

`SupabaseCatalogRepository` será el único módulo que conocerá:

- `@supabase/supabase-js`;
- el tipo generado `Database`;
- nombres de tablas y columnas en `snake_case`;
- filtros y errores de PostgREST.

Los componentes no importarán el SDK, `Database` ni tipos de filas. `packages/contracts` continuará
exponiendo el contrato generado y `packages/domain` no dependerá de la web, Supabase o contratos de
infraestructura.

No se añadirá `@supabase/ssr`: esta fase no administra sesiones, cookies o renovación de tokens.

## 5. Modelo de lectura

El servicio entregará un objeto inmutable `CatalogSnapshot` con la información necesaria para esta
pantalla:

```text
CatalogSnapshot
  brand: id, slug, name, currencyCode
  location: id, slug, name
  categories[]
    id, slug, name, description
    products[]
      id, slug, name, description
      regularPriceCents, currentPriceCents, isOnOffer
      image
      isCustomizable
```

`image` será una unión discriminada:

- imagen pública con `src` y texto alternativo descriptivo;
- placeholder de marca.

Los importes permanecerán como enteros en centavos dentro del modelo. La presentación los formateará
como GTQ utilizando `Intl.NumberFormat` y el locale `es-GT`. No se almacenarán cantidades monetarias
como flotantes ni textos preformateados.

`currentPriceCents` será el precio de oferta cuando exista y, de lo contrario, el precio normal.
`isCustomizable` será verdadero únicamente cuando el producto tenga al menos un grupo de
modificadores aplicable y disponible para la sede.

## 6. Flujo de consulta y traducción

El servicio recibirá `brandSlug` y `locationSlug`. Los valores temporales se fijarán en la
composición de `HomePage`, no dentro del repositorio.

1. Buscar la marca pública activa por slug.
2. Buscar la sede pública activa dentro de esa marca.
3. Consultar en paralelo categorías, productos, grupos, opciones, asignaciones, exclusiones,
   condiciones y disponibilidad de esa sede.
4. Detener el flujo completo si cualquiera de las consultas falla.
5. Traducir identificadores, precios, grupos y opciones a entradas válidas del dominio.
6. Resolver grupos heredados y directos, exclusiones y condiciones.
7. Calcular disponibilidad efectiva con la sede y sin selecciones iniciales.
8. Excluir productos inactivos, no habilitados o bloqueados por falta de opciones obligatorias.
9. Ordenar categorías, productos, grupos y opciones mediante `display_order` y un desempate estable.
10. Devolver el snapshot sin filas ni nombres de infraestructura.

Se prefieren consultas pequeñas, explícitas y delimitadas sobre una única selección profundamente
anidada. RLS seguirá siendo el control de seguridad; los filtros por marca, sede y actividad reducen
datos y documentan la intención de cada consulta.

Un recurso oculto por RLS y uno inexistente producirán el mismo resultado `not_found`. Esta
indistinguibilidad es deliberada y evita revelar registros inactivos.

## 7. Configuración del servidor

Variables requeridas:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
CATALOG_BRAND_SLUG
CATALOG_LOCATION_SLUG
```

Para desarrollo, los slugs serán `bbqbros` y `sucursal-demo-norte`. `.env.example` documentará
formas de ejemplo sin incluir una llave real. `.env.local` permanecerá ignorado por Git.

La configuración será validada en un módulo `server-only`. La carga será perezosa: `next build`
podrá validar el código sin conectarse a una base, pero una petición real devolverá un fallo
operativo claro si falta configuración o la URL no es válida.

El cliente utilizará `createClient<Database>` con la llave publicable. Se deshabilitarán las
funciones de Auth que no corresponden a esta lectura del servidor. Una llave elevada será rechazada
por contrato documental y nunca tendrá variable admitida en esta funcionalidad.

## 8. Caché

Se habilitarán Cache Components de Next.js 16 y se definirá un perfil corto para el catálogo:

- `stale`: 60 segundos;
- `revalidate`: 60 segundos;
- `expire`: 120 segundos;
- etiqueta: `catalog:<brandSlug>:<locationSlug>`.

La clave incluirá marca y sede. El resultado almacenado será el `CatalogSnapshot`, no el cliente ni
la respuesta cruda de Supabase.

La expiración corta evita que la disponibilidad quede retenida indefinidamente y permite que la
consulta ocurra en tiempo de petición, no durante `next build`. La etiqueta prepara una futura
invalidación desde el panel administrativo, pero esta fase no expondrá un endpoint ni Server Action
para activarla.

El checkout futuro deberá revalidar precio y disponibilidad sin confiar en este caché de lectura.

## 9. Resultados y errores

La frontera de aplicación usará resultados discriminados:

- `success`: snapshot con productos vendibles;
- `empty`: marca y sede válidas sin productos vendibles;
- `not_found`: marca o sede ausente o no visible;
- `failure`: configuración inválida, conexión fallida, consulta rechazada o datos imposibles de
  traducir.

Un error parcial nunca producirá una pantalla parcial. Los detalles técnicos se registrarán en el
servidor con contexto seguro, pero la interfaz solo recibirá un código estable y un mensaje
sanitizado. No se registrarán llaves, encabezados de autorización o cadenas de conexión.

La página presentará mensajes diferentes para vacío, no encontrado y fallo técnico. El estado de
fallo ofrecerá una acción normal del navegador para reintentar; no se añadirá lógica cliente solo
para repetir la consulta.

## 10. Presentación y accesibilidad

`HomePage` permanecerá como Server Component. La jerarquía será:

```text
HomePage
  CatalogHeader
  CatalogSection[]
    ProductCard[]
      ProductImage
      ProductPrice
      PersonalizableBadge
  CatalogState
```

La cabecera mostrará marca, título y sede temporal. Cada categoría tendrá un encabezado semántico y
una lista de productos. Cada tarjeta incluirá:

- imagen pública o placeholder BBQBROS;
- nombre;
- descripción opcional;
- precio vigente;
- precio normal tachado y texto de oferta cuando corresponda;
- etiqueta `Personalizable` cuando aplique.

La oferta no dependerá solo del color o tachado para comunicar su significado. Las imágenes tendrán
texto alternativo útil; el placeholder no fingirá representar el producto. Los estados operativos
usarán encabezados y texto comprensibles por lectores de pantalla.

El layout será mobile-first y conservará Brookline, Besley y la paleta aprobada. Esta etapa busca
claridad y estabilidad responsive, no la composición definitiva del storefront.

## 11. Estrategia de pruebas

### Pruebas puras

- configuración válida, ausente y con URL inválida;
- transformación completa al snapshot;
- precios normal y de oferta;
- orden estable;
- producto personalizable;
- imagen pública, ruta inválida y placeholder;
- traducción fallida de datos incompatibles.

### Pruebas de componentes

- catálogo normal;
- producto con oferta;
- producto con imagen y sin imagen;
- etiqueta `Personalizable`;
- estados `empty`, `not_found` y `failure`;
- nombres, encabezados, listas, precios y mensajes accesibles.

### Integración con Supabase local

La prueba utilizará una configuración inyectada con la URL y llave publicable del stack local. No
guardará llaves en fixtures ni usará la llave secreta. Después de `db:reset` comprobará:

- marca y sede sintéticas;
- proyección real bajo RLS pública;
- exclusión de registros inactivos y disponibilidad falsa;
- reglas de modificadores y opciones por sede;
- orden y precios esperados;
- resultados para slugs inexistentes.

La prueba se ejecutará en el trabajo de base de GitHub Actions después de la reconstrucción. Las
pruebas puras y de componentes permanecerán en el trabajo normal del monorepo. El build no dependerá
de una base disponible.

No se añadirá Playwright en esta fase.

## 12. Seguridad

- Solo se admite la llave publicable.
- El cliente, configuración y repositorio se marcan como código exclusivo del servidor.
- Los componentes no reciben configuración o errores crudos.
- Las consultas se ejecutan bajo RLS; no existe bypass.
- No se amplían grants ni políticas de base de datos.
- Las rutas de Storage se validan y deben permanecer dentro del bucket `catalog`.
- No se interpolan valores en expresiones PostgREST sin pasar por la API del cliente.
- No se registran secretos ni datos de V1.
- La dependencia y el lockfile se versionan con números exactos.

## 13. Alternativas descartadas

### Filas de Supabase en componentes

Reduce el mapeo inicial, pero acopla la interfaz a columnas, nullability y relaciones de
persistencia. Haría más costosos los cambios de esquema y las pruebas de presentación.

### `fetch` manual contra PostgREST

Permite controlar directamente HTTP y caché, pero obliga a construir filtros, joins, encabezados y
errores que el cliente oficial ya resuelve y tipa.

### Route Handler interno

Crearía una segunda llamada HTTP dentro de la misma aplicación. No existe todavía un consumidor
externo que justifique esa API adicional.

### Selector temporal de sede

Construiría una interacción destinada a desaparecer. La sede final vendrá de cobertura, por lo que
la prueba utiliza una composición sintética explícita.

### Catálogo completo con configurador

Mezclaría lectura, selección de modificadores y carrito antes de validar la frontera de datos.

## 14. Criterios de aceptación

- La página obtiene datos reales del Supabase local bajo el rol público.
- Ningún componente importa Supabase o tipos de filas.
- El repositorio devuelve un modelo estable y ordenado.
- El dominio decide la disponibilidad efectiva del producto.
- Solo se muestran productos vendibles para la sede fijada.
- Precios, ofertas y personalización se presentan correctamente.
- Las imágenes se limitan al bucket aprobado y existe placeholder.
- Los cuatro estados de carga tienen comportamiento explícito.
- La caché se separa del repositorio y usa marca y sede como clave.
- `next build` no necesita conectarse a Supabase.
- La integración local usa llave publicable y respeta RLS.
- Lint, TypeScript, pruebas, build, pgTAP, advisors y tipos generados aprueban.
- CI no utiliza secretos ni proyectos Supabase enlazados.
- V1 permanece intacta.

## 15. Siguiente documento

Después de aprobar y versionar este diseño se redactará un plan de implementación por etapas. Ese
plan enumerará archivos, dependencias, orden de pruebas, cambios de CI, verificación y commits
previstos antes de escribir código productivo.

## 16. Referencias

- [Supabase: soporte TypeScript](https://supabase.com/docs/reference/javascript/typescript-support)
- [Supabase: Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase: llaves de API](https://supabase.com/docs/guides/getting-started/api-keys)
- [Next.js: Server y Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js: Cache Components](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- [Next.js: `cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
