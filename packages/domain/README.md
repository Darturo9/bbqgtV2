# `@bbqbros/domain`

Biblioteca TypeScript con las reglas puras de catálogo, modificadores, disponibilidad por sede y
carrito del MVP de BBQBros V2.

- Estado: implementado y verificado
- Formato: ESM con declaraciones TypeScript
- Dependencias de ejecución: ninguna
- Persistencia: ninguna
- Entrada pública: `src/index.ts`

Este paquete no importa React, Next.js, NestJS, Supabase ni SDK de proveedores. Tampoco contiene
mensajes de interfaz. Las aplicaciones y adaptadores convierten datos externos a los tipos del
dominio y traducen sus códigos a mensajes para el cliente.

## Flujo principal

```text
datos externos
    │
    ├──> identificadores + Money + precios
    │
    ├──> grupos + condiciones + asignaciones
    │                   │
    │                   └──> disponibilidad por sede
    │
    └──> carrito inmutable ──> revalidación ──> propuesta para aceptación
```

Las funciones no consultan bases de datos, relojes globales ni servicios externos. Toda la
información variable entra como argumento.

## Uso y verificación

Los consumidores deben importar únicamente desde la raíz pública:

```ts
import { createMoney, createProductPrice, type Result } from "@bbqbros/domain";
```

No se deben importar archivos internos de `src` o `dist`.

Comandos del paquete:

```bash
pnpm --filter @bbqbros/domain lint
pnpm --filter @bbqbros/domain typecheck
pnpm --filter @bbqbros/domain test
pnpm --filter @bbqbros/domain build
```

Verificación integral del monorepo:

```bash
pnpm check
```

## Resultados y errores

Los fallos esperados usan un resultado discriminado:

```ts
type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;
```

`DomainError` contiene un código estable, una ruta opcional y detalles simples. No contiene textos
para mostrar directamente al cliente.

`success`, `failure`, `createDomainError` y `DOMAIN_ERROR_CODES` también forman parte de la entrada
pública para que los adaptadores conserven el mismo contrato sin duplicar primitivas.

```ts
const moneyResult = createMoney(12_500);

if (!moneyResult.ok) {
  // La aplicación traduce moneyResult.error.code.
  return;
}

const amount = moneyResult.value; // Q125.00 expresados como 12_500 centavos
```

Los identificadores nominales (`BrandId`, `LocationId`, `CategoryId`, `ProductId`, `ModifierGroupId`
y `ModifierOptionId`) se construyen con `createIdentifier`. El dominio valida y normaliza valores
externos, pero no genera UUID.

## Dinero y precios

Todo importe utiliza centavos enteros de quetzal y la moneda fija `GTQ`.

| API                     | Responsabilidad                                     |
| ----------------------- | --------------------------------------------------- |
| `createMoney`           | Crea importes no negativos.                         |
| `createPriceAdjustment` | Crea ajustes positivos, negativos o cero.           |
| `addMoney`              | Suma importes sin mutarlos.                         |
| `multiplyMoney`         | Multiplica por una cantidad entera no negativa.     |
| `applyPriceAdjustment`  | Aplica un ajuste sin permitir resultados negativos. |
| `sumPriceAdjustments`   | Suma ajustes con protección contra desbordamientos. |
| `createProductPrice`    | Valida precio normal y oferta opcional.             |
| `getEffectivePrice`     | Devuelve la oferta válida o el precio normal.       |
| `getDiscountPercentage` | Deriva el porcentaje visual; no lo almacena.        |

Los precios normales deben ser mayores que cero. Una oferta debe ser mayor que cero y menor que el
precio normal. El dominio no usa números decimales de punto flotante para almacenar dinero.

## Modificadores

### Grupos, opciones y selecciones

`createModifierOption` y `createModifierGroup` impiden construir configuraciones contradictorias.

- Un grupo es de selección `single` o `multiple`.
- La obligatoriedad se deriva de `minSelections > 0`.
- Un grupo `single` solamente admite `0..1` o `1..1`.
- `maxSelections` no puede superar las opciones editoriales activas.
- Las opciones deben pertenecer a la misma marca y al mismo grupo.
- `isModifierGroupRequired` consulta la obligatoriedad derivada.
- `validateModifierSelection` devuelve opciones en orden canónico y su ajuste total.
- `calculateConfiguredPrice` nunca permite un precio unitario negativo.

### Condiciones

`validateModifierConditions` crea un `ModifierConditionGraph` acíclico. Una condición indica que una
opción de un grupo padre activa un grupo hijo.

- Varias opciones activadoras utilizan semántica `OR`.
- Las autorreferencias y los ciclos son inválidos.
- Una selección de un padre inactivo no activa descendientes.
- `getActiveModifierGroups` conserva el orden de los grupos recibidos.

### Asignaciones

`resolveModifierGroupsForProduct` combina grupos reutilizables:

1. aplica los grupos heredados de la categoría;
2. respeta exclusiones explícitas del producto;
3. agrega los grupos directos del producto;
4. rechaza cualquier grupo efectivo duplicado.

Excluir un grupo heredado y asignarlo directamente es válido: en el resultado existe una sola
asignación efectiva con origen `product`.

## Disponibilidad por sede

`LocationAvailability` es una proyección mínima. Conserva la marca, la sede y listas de
identificadores de productos y opciones habilitados; no duplica nombres, reglas ni precios.

`resolveProductAvailability` devuelve `Result<ProductAvailability, DomainError>`:

- un error representa datos inconsistentes, como otra marca, otra sede o identificadores duplicados;
- un resultado con `isAvailable: false` representa una situación comercial válida, como producto
  inactivo, agotado o sin suficientes opciones para un grupo obligatorio.

Las opciones agotadas se filtran sin modificar el `ModifierGroup` original. Los grupos condicionales
que todavía no están activos no bloquean el producto.

## Carrito

Un `Cart` pertenece a una marca y una sede, conserva líneas inmutables y vence exactamente 24 horas
después de `createdAt`.

Constantes principales:

- `CART_LIFETIME_MILLISECONDS`: 24 horas;
- `MAX_CART_LINE_QUANTITY`: 20 unidades;
- `MAX_CART_TOTAL_QUANTITY`: 50 unidades;
- `MAX_SPECIAL_INSTRUCTIONS_LENGTH`: 200 caracteres visibles.

Operaciones públicas:

| API                      | Resultado                                                       |
| ------------------------ | --------------------------------------------------------------- |
| `createCart`             | Crea un carrito vacío y deriva `expiresAt`.                     |
| `addCartLine`            | Agrega o combina una configuración idéntica.                    |
| `updateCartLineQuantity` | Actualiza la cantidad; cero elimina la línea.                   |
| `removeCartLine`         | Elimina una línea sin mutar el carrito.                         |
| `clearCart`              | Devuelve un carrito sin líneas.                                 |
| `isCartExpired`          | Compara la vigencia contra el reloj recibido.                   |
| `calculateCartTotals`    | Deriva cantidades, subtotales por línea y subtotal del carrito. |

`normalizeSpecialInstructions` recorta las instrucciones, normaliza sus espacios internos y cuenta
su longitud por grafemas Unicode. Las instrucciones no intervienen en el precio.

`createCartLineKey` deriva un `CartLineKey` mediante una codificación estructurada de:

- producto;
- grupos y opciones seleccionadas en orden canónico;
- instrucciones normalizadas.

El orden de entrada y las selecciones opcionales vacías no cambian la clave. El precio tampoco forma
parte de la identidad. Si una configuración idéntica llega con otro precio, `addCartLine` devuelve
`CART_LINE_PRICE_MISMATCH` para evitar una actualización silenciosa.

El subtotal incluye productos y ajustes de modificadores. No incluye tarifa de entrega.

## Revalidación

`revalidateCart` compara el snapshot local con productos, reglas y disponibilidad vigentes. Devuelve
`Result<CartRevalidationReport, DomainError>`.

Los errores de entrada detienen la operación. Las diferencias comerciales se acumulan mediante:

- `LOCATION_CHANGED`;
- `PRODUCT_NOT_FOUND`;
- `PRODUCT_NOT_AVAILABLE`;
- `OPTION_NOT_AVAILABLE`;
- `SELECTION_INVALID`;
- `PRICE_CHANGED`.

El informe contiene:

- `issues`: diferencias estructuradas en orden determinista;
- `removedLineKeys`: líneas que no pueden conservarse en la propuesta;
- `proposedCart`: carrito actualizado, todavía no aceptado;
- `requiresCustomerAcceptance`: indicador explícito para la interfaz.

El carrito recibido nunca se modifica. Si no existen incidencias, `proposedCart` es exactamente el
mismo objeto. Si una selección dejó de ser válida, la línea se retira de la propuesta y no se
inventa un precio vigente para una configuración incompleta.

## Decisiones de implementación

- `resolveProductAvailability` devuelve `Result`, aunque la firma ilustrativa inicial mostraba un
  valor directo. Esto separa configuraciones inválidas de indisponibilidad comercial.
- `calculateCartTotals` también devuelve `Result` porque una suma o multiplicación puede exceder el
  rango entero seguro.
- `ProductAvailabilityCandidate` representa solo identidad, marca y estado editorial. El modelo
  completo de `Product`, `Category` y `BrandCatalog` se definirá junto al esquema persistente para
  no anticipar columnas de Supabase.
- El carrito conserva el precio unitario efectivo configurado. Detecta cambios que alteran el
  importe cobrado, ya provengan del precio normal, de una oferta o de los modificadores. Un cambio
  del precio normal oculto por una oferta efectiva idéntica no genera `PRICE_CHANGED`.
- La revalidación recibe los grupos efectivos de cada producto. La resolución de herencia y
  exclusiones ocurre antes mediante `resolveModifierGroupsForProduct`.

## Fuera de alcance

- Persistencia o serialización del carrito.
- Esquema y migraciones de Supabase.
- Componentes React y estado de interfaz.
- Cobertura geográfica, dirección y tarifa de entrega.
- Checkout y creación de órdenes.
- Cupones o promociones avanzadas.
- NeoPay, FEL, WhatsApp y GoNau.
