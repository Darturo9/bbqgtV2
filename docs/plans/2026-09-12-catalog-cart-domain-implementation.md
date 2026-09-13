# Plan de implementación del dominio de catálogo y carrito

- Estado: implementado
- Fecha: 2026-09-12
- Diseño relacionado: `2026-09-12-catalog-cart-domain-design.md`
- Paquete principal: `packages/domain`
- Alcance: TypeScript puro, datos sintéticos y pruebas en memoria
- Finalización: 2026-09-12

## 1. Resultado esperado

Convertir las reglas aprobadas de catálogo, modificadores, disponibilidad y carrito en una
biblioteca TypeScript independiente de aplicaciones e infraestructura.

Al finalizar, `@bbqbros/domain` deberá:

- compilar a JavaScript ESM y declaraciones TypeScript;
- exponer una API pública pequeña desde `src/index.ts`;
- no tener dependencias de ejecución;
- validar sus invariantes mediante fábricas y funciones puras;
- representar fallos esperados con resultados tipados;
- contar con pruebas unitarias legibles y deterministas;
- ejecutar tareas reales de lint, TypeScript, pruebas y build dentro de `pnpm check`.

Este plan no crea tablas, endpoints, componentes React ni datos reales del restaurante.

## 2. Enfoque de implementación

Se utilizará un estilo funcional:

- estructuras `readonly`;
- tipos nominales para identificadores;
- fábricas que impiden construir valores inválidos;
- funciones que reciben un estado y devuelven uno nuevo;
- un `Result<T, E>` discriminado para errores esperados;
- excepciones reservadas para defectos de programación no recuperables.

No se crearán clases con estado mutable. Tampoco se introducirá una biblioteca de dominio, dinero,
validación o grafos: las reglas necesarias son pequeñas y pueden expresarse con TypeScript y la
biblioteca estándar.

## 3. Árbol objetivo

```text
packages/domain/
├── eslint.config.mjs
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.mts
└── src/
    ├── index.ts
    ├── shared/
    │   ├── domain-error.ts
    │   ├── identifier.test.ts
    │   ├── identifier.ts
    │   └── result.ts
    ├── money/
    │   ├── money.test.ts
    │   ├── money.ts
    │   ├── product-price.test.ts
    │   └── product-price.ts
    ├── catalog/
    │   ├── availability.test.ts
    │   ├── availability.ts
    │   ├── model.ts
    │   ├── modifier-assignments.test.ts
    │   ├── modifier-assignments.ts
    │   ├── modifier-conditions.test.ts
    │   ├── modifier-conditions.ts
    │   ├── modifier-selection.test.ts
    │   └── modifier-selection.ts
    └── cart/
        ├── cart.test.ts
        ├── cart.ts
        ├── instructions.test.ts
        ├── instructions.ts
        ├── line-key.test.ts
        ├── line-key.ts
        ├── model.ts
        ├── revalidation.test.ts
        └── revalidation.ts
```

Los nombres podrán ajustarse durante la implementación si una prueba demuestra que una separación es
artificial. No se crearán archivos vacíos como marcadores de posición.

## 4. Configuración del paquete

### `package.json`

Se completará el marcador actual con:

- `type: "module"`;
- `sideEffects: false`;
- exportación pública desde `dist/index.js` y `dist/index.d.ts`;
- scripts `lint`, `typecheck`, `test`, `test:watch` y `build`;
- archivos publicables limitados a `dist`, aunque el paquete continúe privado.

Dependencias de desarrollo, fijadas a las versiones ya utilizadas por el monorepo:

- `@eslint/js` 9.39.3;
- `@types/node` 24.13.4;
- `eslint` 9.39.3;
- `typescript` 5.9.3;
- `typescript-eslint` 8.70.0;
- `vitest` 5.0.0.

No habrá dependencias de producción.

### TypeScript

`tsconfig.json` comprobará fuente y pruebas con:

- modo `strict`;
- `noUncheckedIndexedAccess`;
- `exactOptionalPropertyTypes`;
- `useUnknownInCatchVariables`;
- resolución ESM compatible con Node;
- objetivo ES2022;
- `noEmit` para la tarea de tipos.

`tsconfig.build.json` emitirá solamente `src` sin pruebas, con declaraciones y mapas de declaración
en `dist`. El directorio `dist` será regenerable y permanecerá fuera de Git.

### ESLint y Vitest

ESLint utilizará la configuración recomendada de JavaScript y TypeScript, sin reglas de React.
Vitest ejecutará en entorno Node y buscará pruebas dentro de `src`.

## 5. API pública prevista

La API definitiva se comprobará con pruebas de tipos. Las firmas siguientes marcan la intención y
pueden refinarse sin ampliar el alcance.

### Resultados y errores

```ts
type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;

type DomainError = Readonly<{
  code: DomainErrorCode;
  path?: string;
  details?: Readonly<Record<string, string | number | boolean>>;
}>;
```

El dominio no incluirá mensajes para el usuario. `code`, `path` y `details` permitirán que la web
construya un mensaje localizado sin analizar texto libre.

### Identificadores

Se expondrán tipos nominales para `BrandId`, `LocationId`, `CategoryId`, `ProductId`,
`ModifierGroupId` y `ModifierOptionId`. Una única fábrica validará que el valor externo sea una
cadena no vacía y normalizada. El dominio no generará UUID; esa responsabilidad pertenecerá al
límite que crea el registro.

### Dinero y precios

```ts
createMoney(minorUnits: number): Result<Money, DomainError>;
createPriceAdjustment(minorUnits: number): Result<PriceAdjustment, DomainError>;
createProductPrice(input: {
  regular: Money;
  sale?: Money;
}): Result<ProductPrice, DomainError>;
getEffectivePrice(price: ProductPrice): Money;
getDiscountPercentage(price: ProductPrice): number | null;
```

`Money` admitirá solamente enteros seguros no negativos. `PriceAdjustment` admitirá enteros seguros
con signo para permitir créditos o sustituciones futuras, pero ninguna configuración podrá producir
un precio unitario negativo.

### Catálogo y modificadores

```ts
createModifierGroup(input): Result<ModifierGroup, DomainError>;
validateModifierConditions(input): Result<ModifierConditionGraph, DomainError>;
resolveModifierGroupsForProduct(input): Result<readonly ResolvedModifierGroup[], DomainError>;
getActiveModifierGroups(input): Result<readonly ModifierGroup[], DomainError>;
validateModifierSelection(input): Result<ValidatedModifierSelection, DomainError>;
resolveProductAvailability(input): ProductAvailability;
```

La obligatoriedad se derivará de `minSelections > 0`; no existirá un segundo booleano que pueda
contradecir los límites.

Para selección única solamente se aceptarán estos rangos:

- opcional: `0..1`;
- obligatorio: `1..1`.

Para selección múltiple, `0 <= minSelections <= maxSelections`. El máximo debe ser finito y no puede
superar la cantidad de opciones activas.

Las asignaciones de categoría se resolverán primero y respetarán exclusiones explícitas. Los grupos
directos del producto se agregarán después. Una duplicación efectiva de `ModifierGroupId` devolverá
un error de configuración.

### Carrito

```ts
createCart(input): Result<Cart, DomainError>;
addCartLine(cart, input): Result<Cart, DomainError>;
updateCartLineQuantity(cart, input): Result<Cart, DomainError>;
removeCartLine(cart, lineKey): Cart;
clearCart(cart): Cart;
isCartExpired(cart, now): boolean;
calculateCartTotals(cart): CartTotals;
revalidateCart(input): CartRevalidationReport;
```

Las operaciones no mutarán el carrito recibido. `now` entrará como parámetro; las funciones puras no
consultarán directamente `Date.now()`.

`revalidateCart` devolverá un informe capaz de acumular varias diferencias en una sola ejecución:

- líneas válidas sin cambios;
- precios modificados;
- productos u opciones no disponibles;
- selecciones que dejaron de ser válidas;
- cambio de sede;
- carrito resultante propuesto;
- indicador de si se requiere aceptación del cliente.

## 6. Invariantes que deben quedar en código

### Catálogo

- Ninguna relación puede cruzar marcas.
- Un producto pertenece exactamente a una categoría.
- El precio normal es mayor que cero.
- El precio de oferta es menor que el precio normal.
- El precio configurado nunca es negativo.
- Los grupos no tienen opciones duplicadas.
- Las condiciones apuntan a grupos y opciones existentes.
- El grafo de condiciones es acíclico.
- Una asignación efectiva no repite grupos.

### Disponibilidad

- La sede solamente habilita o deshabilita productos y opciones.
- Un producto inactivo o no disponible no puede configurarse.
- Una opción inactiva o no disponible no puede seleccionarse.
- Un grupo activo obligatorio debe conservar suficientes opciones disponibles.
- Una condición inactiva no obliga a completar su grupo hijo.

### Carrito

- Las líneas pertenecen a la misma marca y sede del carrito.
- La cantidad por línea está entre 1 y 20.
- La suma del carrito no supera 50 unidades.
- Las instrucciones normalizadas no superan 200 caracteres.
- La clave de línea ignora el orden de opciones, pero no sus identidades ni instrucciones.
- Agregar una configuración idéntica combina cantidades sin superar límites.
- Los totales se derivan de las líneas; no se aceptan como entrada confiable.

## 7. Plan por cambios y commits

Cada etapa termina con pruebas y un commit Conventional Commit. No se mezclarán varias etapas en un
solo commit si una puede verificarse de forma independiente.

### Etapa 1: activar `@bbqbros/domain`

Archivos:

- modificar `packages/domain/package.json`;
- crear `packages/domain/tsconfig.json`;
- crear `packages/domain/tsconfig.build.json`;
- crear `packages/domain/eslint.config.mjs`;
- crear `packages/domain/vitest.config.mts`;
- crear `packages/domain/src/index.ts`;
- crear `packages/domain/src/package-boundary.test.ts`;
- actualizar `pnpm-lock.yaml`.

La prueba inicial comprobará que el manifiesto siga siendo privado, ESM y sin dependencias de
ejecución. Esto hace que la tarea de Vitest valide una frontera real antes de incorporar reglas de
negocio.

Comprobaciones:

```bash
pnpm --filter @bbqbros/domain lint
pnpm --filter @bbqbros/domain typecheck
pnpm --filter @bbqbros/domain test
pnpm --filter @bbqbros/domain build
```

Commit previsto:

```text
chore(domain): activate TypeScript package
```

### Etapa 2: resultados, errores e identificadores

Archivos:

- crear `src/shared/result.ts`;
- crear `src/shared/domain-error.ts`;
- crear `src/shared/identifier.ts`;
- crear `src/shared/identifier.test.ts`;
- actualizar `src/index.ts`.

Casos principales:

- construir cada identificador desde una cadena válida;
- rechazar cadenas vacías o compuestas solo por espacios;
- preservar el valor opaco sin generar identificadores;
- diferenciar las ramas `ok` y `error` de `Result`.

Commit previsto:

```text
feat(domain): add shared domain primitives
```

### Etapa 3: dinero y precio de producto

Archivos:

- crear `src/money/money.ts` y `money.test.ts`;
- crear `src/money/product-price.ts` y `product-price.test.ts`;
- actualizar `src/index.ts`.

Casos principales:

- aceptar cero y enteros seguros para `Money`;
- rechazar negativos, decimales, infinitos y enteros inseguros;
- aceptar ajustes positivos, cero y negativos;
- sumar y multiplicar sin mutación;
- rechazar resultados monetarios negativos o inseguros;
- aceptar una oferta menor que el precio regular;
- rechazar ofertas cero, iguales o superiores;
- obtener el precio efectivo y derivar el porcentaje visual.

Commit previsto:

```text
feat(domain): model GTQ money and product prices
```

### Etapa 4: grupos, opciones y selecciones

Archivos:

- crear `src/catalog/model.ts`;
- crear `src/catalog/modifier-selection.ts` y su prueba;
- actualizar `src/index.ts`.

Casos principales:

- crear grupos de selección única opcionales y obligatorios;
- crear grupos múltiples con rangos válidos;
- rechazar rangos contradictorios y opciones duplicadas;
- rechazar opciones ajenas al grupo o la marca;
- rechazar opciones inactivas;
- validar selecciones completas y devolver una forma canónica ordenada;
- impedir que los ajustes produzcan un precio unitario negativo.

Commit previsto:

```text
feat(domain): model modifier selections
```

### Etapa 5: condiciones y asignaciones

Archivos:

- crear `src/catalog/modifier-conditions.ts` y su prueba;
- crear `src/catalog/modifier-assignments.ts` y su prueba;
- actualizar `src/index.ts`.

Casos principales:

- activar un grupo hijo mediante una opción padre;
- mantener inactivo un grupo cuya condición no se cumple;
- aceptar varias opciones activadoras con semántica `OR`;
- rechazar autorreferencias, referencias inexistentes y ciclos;
- heredar grupos de categoría;
- respetar exclusiones por producto;
- agregar grupos propios después de los heredados;
- rechazar un grupo efectivo duplicado.

Commit previsto:

```text
feat(domain): resolve modifier rules and assignments
```

### Etapa 6: disponibilidad por sede

Archivos:

- crear `src/catalog/availability.ts` y su prueba;
- actualizar `src/index.ts`.

Casos principales:

- resolver un producto disponible en una sede;
- bloquear un producto agotado o inactivo;
- filtrar opciones agotadas sin alterar precios;
- bloquear un producto cuando un grupo activo no alcanza su mínimo;
- ignorar grupos condicionales que todavía no están activos;
- rechazar disponibilidad perteneciente a otra marca o sede.

Commit previsto:

```text
feat(domain): enforce location catalog availability
```

### Etapa 7: modelo y operaciones del carrito

Archivos:

- crear `src/cart/model.ts`;
- crear `src/cart/instructions.ts` y su prueba;
- crear `src/cart/line-key.ts` y su prueba;
- crear `src/cart/cart.ts` y su prueba;
- actualizar `src/index.ts`.

Casos principales:

- crear un carrito vacío con marca, sede y vencimiento;
- normalizar espacios e instrucciones vacías;
- rechazar instrucciones mayores de 200 caracteres;
- generar la misma clave para opciones equivalentes en distinto orden;
- generar claves diferentes para opciones o instrucciones distintas;
- agregar, combinar, actualizar, eliminar y vaciar líneas sin mutación;
- aplicar los límites de 20 unidades por línea y 50 por carrito;
- calcular subtotales y total exclusivamente desde precios validados;
- evaluar expiración con un reloj recibido como argumento.

Commit previsto:

```text
feat(domain): implement immutable cart operations
```

### Etapa 8: revalidación del carrito

Archivos:

- crear `src/cart/revalidation.ts` y su prueba;
- actualizar `src/index.ts`.

Casos principales:

- devolver un informe sin cambios;
- detectar cambios de precio normal u oferta;
- detectar producto u opción agotada;
- detectar una selección que ya no satisface sus reglas;
- detectar cambio de sede;
- acumular varios problemas en una sola respuesta;
- proponer un carrito actualizado sin considerarlo aceptado;
- marcar expresamente cuándo se requiere confirmación del cliente.

Commit previsto:

```text
feat(domain): add cart revalidation report
```

### Etapa 9: documentar la API implementada

Archivos:

- actualizar `packages/domain/README.md`;
- actualizar este plan a estado `implementado`;
- actualizar el diseño relacionado a implementación completada;
- registrar cualquier desviación real de nombres o firmas.

Comprobación final:

```bash
pnpm check
```

Commit previsto:

```text
docs(domain): document catalog and cart API
```

## 8. Orden de dependencias

```text
Result + identificadores
          │
          ├──> Money + precios
          │        │
          │        └──> modificadores + selecciones
          │                     │
          │                     ├──> condiciones + asignaciones
          │                     └──> disponibilidad
          │
          └──> carrito ──> revalidación
```

No se iniciará una etapa si la anterior no compila y sus pruebas no pasan. Esto mantiene cada fallo
dentro de un contexto pequeño.

## 9. Verificación por etapa

Durante el desarrollo se ejecutará primero la prueba del archivo modificado y después las tareas del
paquete:

```bash
pnpm --filter @bbqbros/domain exec vitest run <archivo>
pnpm --filter @bbqbros/domain lint
pnpm --filter @bbqbros/domain typecheck
pnpm --filter @bbqbros/domain test
pnpm --filter @bbqbros/domain build
```

Antes de cerrar cada cambio cohesivo se ejecutará también `pnpm check` desde la raíz. No se
aceptarán pruebas que solo repliquen la implementación; cada nombre debe expresar una regla
observable.

Las pruebas unitarias son la capa principal porque el dominio es puro. Las pruebas de integración
con Supabase y las pruebas E2E de la web se crearán en sus fases correspondientes, no como parte de
este paquete.

## 10. Riesgos y controles

### API demasiado amplia

Control: exportar solamente desde `src/index.ts` y mantener auxiliares internos sin exportación
pública.

### Tipos que duplican el futuro esquema

Control: nombrar conceptos por reglas del negocio y crear adaptadores cuando exista Supabase. No
incluir nombres de tablas ni tipos generados por la base.

### Dependencias condicionales complejas

Control: admitir solamente activación por opción, semántica `OR` y grafo acíclico.

### Clave de línea inestable

Control: normalizar instrucciones, ordenar identificadores de opciones y probar estabilidad sin
depender del orden de entrada.

### Revalidación que cambia datos silenciosamente

Control: separar `carrito propuesto` de `carrito aceptado` y devolver un indicador explícito de
confirmación requerida.

### Precisión monetaria

Control: aceptar solamente enteros seguros en centavos y rechazar cualquier resultado fuera de ese
rango.

## 11. Condiciones de finalización

La implementación estará terminada cuando:

- todos los archivos previstos tengan comportamiento real o se documente su eliminación;
- no existan dependencias de ejecución en `@bbqbros/domain`;
- la API pública no exponga detalles de React, Supabase o NestJS;
- cada invariante aprobada tenga al menos una prueba representativa;
- `pnpm --filter @bbqbros/domain lint` pase sin advertencias;
- `pnpm --filter @bbqbros/domain typecheck` pase;
- todas las pruebas del paquete pasen;
- el build produzca `dist` y declaraciones consumibles;
- `pnpm check` pase desde la raíz;
- la documentación describa las firmas realmente implementadas;
- el repositorio quede limpio después de cada commit.

## 12. Fuera de alcance

- Persistencia y migraciones de Supabase.
- Contratos HTTP o esquemas de `packages/contracts`.
- Estado de React, `localStorage` y componentes de interfaz.
- Validación geográfica de cobertura.
- Tarifa de entrega y checkout.
- Creación y estados de órdenes.
- Migración del catálogo V1.
- NeoPay, FEL, WhatsApp y GoNau.

## 13. Continuidad

El diseño de persistencia quedó documentado en
[`2026-09-12-supabase-local-catalog-design.md`](2026-09-12-supabase-local-catalog-design.md). Este
registro no autoriza por sí solo la creación de migraciones: primero requiere un plan de
implementación revisado y aprobado.

## 14. Registro final

Las nueve etapas previstas quedaron implementadas. El resultado conserva el árbol objetivo, no
introduce dependencias de ejecución y se publica internamente mediante una sola entrada ESM.

Verificación al cierre:

- `pnpm check` aprobado;
- lint y TypeScript sin advertencias;
- build ESM y declaraciones consumibles;
- 154 pruebas unitarias del dominio aprobadas;
- datos de prueba completamente sintéticos;
- ninguna dependencia de React, Next.js, NestJS, Supabase o proveedores.

Refinamientos respecto a las firmas ilustrativas:

- `resolveProductAvailability` devuelve `Result<ProductAvailability, DomainError>` para distinguir
  datos inconsistentes de indisponibilidad comercial;
- `calculateCartTotals` devuelve `Result<CartTotals, DomainError>` porque mantiene protección contra
  desbordamientos;
- `revalidateCart` devuelve un `CartRevalidationReport` dentro de `Result`, conserva el carrito
  original y separa explícitamente la propuesta de su aceptación;
- `createCart` recibe `createdAt` y deriva una expiración exacta de 24 horas;
- `LocationAvailability` usa listas de identificadores habilitados y no duplica datos del catálogo;
- `CartLineKey` ignora orden de entrada y selecciones opcionales vacías;
- la revalidación compara el precio unitario efectivo; un cambio del precio normal oculto por una
  oferta efectiva idéntica no genera `PRICE_CHANGED`;
- los modelos editoriales completos de `BrandCatalog`, `Category` y `Product` quedaron diferidos al
  diseño persistente, mientras el dominio expone solamente los datos mínimos que requieren sus
  reglas actuales.

Commits funcionales del plan:

- `dbbef4a` — activar el paquete TypeScript;
- `0451bca` — primitivas compartidas;
- `f8d0db1` — dinero y precios;
- `7933a71` — modificadores y selecciones;
- `41be52c` — condiciones y asignaciones;
- `d7ed09d` — disponibilidad por sede;
- `d096d05` — operaciones del carrito;
- `755eb9c` — identidad correcta para selecciones vacías;
- `d5f1926` — informe de revalidación.
