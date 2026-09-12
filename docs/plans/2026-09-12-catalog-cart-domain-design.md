# Diseño del dominio de catálogo y carrito

- Estado: aprobado
- Fecha: 2026-09-12
- Alcance: reglas puras de catálogo, modificadores y carrito del MVP
- Implementación: pendiente

## 1. Objetivo

Definir el primer núcleo de negocio de BBQBros V2 antes de crear tablas, conectarlo con Next.js o
iniciar la API de integraciones. El resultado debe permitir entender y probar el comportamiento del
catálogo y del carrito sin depender de React, Supabase, NestJS ni proveedores externos.

La V1 se utilizó solamente como referencia funcional. Sus estructuras y archivos no se copiarán de
forma automática.

## 2. Decisiones aprobadas

### Catálogo multimarcas y multisedes

- Cada marca tiene un catálogo propio.
- BBQBROS será la única marca activa durante el lanzamiento.
- Las categorías, productos, modificadores, opciones, nombres y precios pertenecen a la marca.
- Los precios son iguales en todas las sedes de una marca.
- Cada sede controla la disponibilidad de productos y opciones de modificadores.
- Una sede no puede cambiar nombres ni precios del catálogo.
- Si un grupo obligatorio no conserva suficientes opciones disponibles, el producto no puede
  configurarse en esa sede.

### Precios

- El dinero se representa en centavos de quetzal mediante enteros no negativos.
- Un producto tiene un precio normal y puede tener un precio de oferta opcional.
- El precio de oferta debe ser mayor que cero y menor que el precio normal.
- El porcentaje de descuento se calcula para presentación; no se almacena como una segunda regla.
- Los ajustes de precio de las opciones también se expresan en centavos.
- Todos los precios visibles incluyen IVA y se muestran como importes finales para el cliente.
- Cupones, promociones programadas, descuentos por cantidad y reglas como `2x1` quedan fuera del
  MVP.

### Modificadores

V2 utilizará un solo concepto de grupo de modificadores. No conservará la duplicación de tablas de
categoría y producto de la V1.

- Un `ModifierGroup` contiene reglas de selección y opciones.
- Un `ModifierAssignment` asocia un grupo reutilizable con una categoría o un producto.
- Un grupo admite selección única o múltiple.
- Los mínimos y máximos forman parte de la regla del grupo.
- Un grupo puede ser obligatorio u opcional.
- Un `ModifierCondition` puede activar un grupo cuando se elige una opción concreta de otro grupo.
- Las condiciones serán simples y declarativas; no se admitirá código ni fórmulas dinámicas.
- El sistema rechazará dependencias hacia el mismo grupo y ciclos entre grupos.

Esta estructura conserva casos reales de la V1, como seleccionar un combo básico o premium y mostrar
posteriormente el grupo de acompañamientos correspondiente.

### Carrito

- El carrito existe solamente en el navegador hasta que el cliente comienza el checkout.
- Se separa por marca y caduca localmente después de 24 horas.
- No se sincroniza entre dispositivos y no requiere una cuenta de cliente.
- Supabase no recibirá carritos abandonados durante esta fase.
- Una línea admite entre 1 y 20 unidades.
- El carrito admite como máximo 50 unidades en total.
- Las instrucciones especiales son opcionales y tienen un máximo de 200 caracteres.
- Las instrucciones no pueden agregar productos, extras con costo ni alterar el precio.

La identidad de una línea se construye a partir del producto, las opciones seleccionadas y las
instrucciones normalizadas. El orden de selección de las opciones no modifica esa identidad.

- Dos configuraciones idénticas se combinan incrementando su cantidad.
- Opciones diferentes producen líneas diferentes.
- Instrucciones diferentes producen líneas diferentes.
- Reducir una cantidad a cero elimina la línea.

### Dirección y sede

- El cliente puede explorar el catálogo general sin proporcionar datos personales.
- Al agregar el primer producto debe indicar la dirección de entrega.
- El servidor valida cobertura y asigna automáticamente una sede.
- La sede queda vinculada al carrito local para mostrar disponibilidad efectiva.
- Cambiar la dirección obliga a asignar nuevamente la sede y revalidar todo el carrito.
- La selección y prioridad de cobertura se diseñarán en una fase específica.

## 3. Modelo conceptual

### `BrandCatalog`

Raíz conceptual que delimita los elementos comerciales de una marca. Impide combinar categorías,
productos o modificadores pertenecientes a marcas diferentes.

### `Category`

Organiza productos para presentación. Incluye identidad, nombre, descripción, orden y estado
editorial. No calcula precios ni disponibilidad.

### `Product`

Representa un artículo vendible del catálogo. Incluye identidad, categoría, información visible,
precios, imágenes, orden y estado editorial.

### `Money`

Objeto de valor inmutable para cantidades monetarias en GTQ. Usa centavos enteros y concentra suma,
multiplicación, comparación y formato de intercambio sin depender de números decimales de punto
flotante.

### `ModifierGroup` y `ModifierOption`

Un grupo formula una elección y define tipo, obligatoriedad, mínimo y máximo. Sus opciones contienen
nombre, descripción, orden y ajuste de precio.

### `ModifierAssignment`

Asocia un grupo con una categoría o producto. Las reglas de precedencia y exclusión para productos
concretos se cerrarán antes de diseñar el esquema de persistencia.

### `ModifierCondition`

Relación dirigida donde una opción padre activa un grupo hijo. El grafo completo debe ser acíclico.

### `LocationAvailability`

Proyección de los productos y opciones habilitados en una sede. No duplica la definición del
catálogo ni sus precios.

### `Cart` y `CartLine`

El carrito administra sede, vigencia, líneas, cantidades y total provisional. Una línea conserva la
configuración seleccionada y una clave estable para combinar elementos equivalentes.

## 4. Cálculo

El precio efectivo de un producto es su precio de oferta válido o, en su ausencia, su precio normal.

```text
precio unitario configurado = precio efectivo + suma de ajustes activos
subtotal de línea = precio unitario configurado × cantidad
subtotal del carrito = suma de subtotales de línea
```

La tarifa de entrega no forma parte del subtotal del catálogo. Se incorporará después de validar la
cobertura y se diseñará junto con el checkout.

El carrito local muestra importes provisionales. El servidor siempre vuelve a calcularlos con el
catálogo vigente antes de permitir la creación de una orden.

## 5. Revalidación

La revalidación ocurre al menos cuando:

- se establece o cambia la dirección;
- cambia la sede asignada;
- comienza el checkout;
- se recupera un carrito local caducado o cercano a caducar.

Se comprueban marca, sede, productos, precios, ofertas, grupos activos, condiciones, opciones,
disponibilidad, cantidades e instrucciones.

Los cambios no se aceptan silenciosamente. El cliente debe conocer y aceptar cualquier diferencia
antes de crear la orden. Un producto u opción agotada debe reemplazarse o eliminarse. Un cambio de
precio debe mostrar el importe anterior y el vigente.

## 6. Límites técnicos

```text
apps/web
  -> presenta información, conserva el carrito local y envía comandos
packages/domain
  -> valida configuraciones, calcula importes y aplica invariantes
Supabase
  -> persiste el catálogo y la disponibilidad vigente
```

`packages/domain` no importará React, Next.js, Supabase, NestJS ni SDK de proveedores. Sus funciones
recibirán datos simples y devolverán resultados explícitos.

Los textos de interfaz no vivirán en el dominio. El dominio devolverá códigos y datos estructurados;
la web decidirá cómo explicarlos al cliente.

## 7. Errores de dominio previstos

- `PRODUCT_NOT_AVAILABLE`
- `OPTION_NOT_AVAILABLE`
- `REQUIRED_SELECTION_MISSING`
- `SELECTION_LIMIT_EXCEEDED`
- `INVALID_MODIFIER_DEPENDENCY`
- `CART_LINE_LIMIT_EXCEEDED`
- `CART_TOTAL_LIMIT_EXCEEDED`
- `SPECIAL_INSTRUCTIONS_TOO_LONG`
- `PRICE_CHANGED`
- `LOCATION_CHANGED`

La lista definitiva se cerrará durante el plan de implementación. Los errores esperados se modelarán
como resultados tipados, no como excepciones técnicas sin contexto.

## 8. Estrategia de pruebas

La primera implementación utilizará datos sintéticos en memoria. Deberá cubrir:

- construcción y operaciones de `Money`;
- validez de precios normales y de oferta;
- selección única y múltiple;
- grupos obligatorios y límites de selección;
- activación de grupos condicionales;
- detección de dependencias circulares;
- disponibilidad de productos y opciones por sede;
- configurabilidad efectiva de un producto;
- cálculo de líneas y carrito;
- combinación estable de líneas idénticas;
- separación por opciones o instrucciones diferentes;
- límites por línea y por carrito;
- normalización de instrucciones;
- revalidación ante cambios de precio, sede y disponibilidad.

El criterio de éxito es que las reglas puedan comprenderse y verificarse sin abrir componentes de
React ni consultar una base de datos.

## 9. Alternativas descartadas

### Copiar el modelo de V1

Se descarta porque separa modificadores de categoría y producto, distribuye reglas entre React y
consultas, y permite fuentes de precio redundantes.

### Modificadores solamente por producto

Reduce el modelo inicial, pero obliga a duplicar combos y acompañamientos compartidos.

### Carritos anónimos persistidos en Supabase

Permitirían recuperación remota, pero introducen tokens, expiración, limpieza, permisos y datos
abandonados sin una necesidad aprobada para el MVP.

### Solicitar la dirección antes de mostrar el menú

Garantiza disponibilidad exacta desde el inicio, pero añade fricción antes de que el cliente conozca
la oferta. El punto intermedio aprobado es solicitarla al agregar el primer producto.

## 10. Fuera de alcance

- Esquema o migraciones de Supabase.
- Implementación de componentes de catálogo o carrito.
- Checkout, tarifa de entrega y creación de órdenes.
- Cupones y promociones avanzadas.
- Cuentas o historial de clientes.
- Migración del catálogo real de V1.
- NeoPay, FEL, WhatsApp y GoNau.

## 11. Asuntos pendientes para fases posteriores

- Precedencia y exclusiones cuando un producto hereda grupos de su categoría.
- Catálogo real que el dueño de BBQBROS apruebe migrar desde V1.
- Sedes, coberturas, horarios y tarifas definitivas.
- Reglas fiscales detalladas para construir el desglose de FEL sin cambiar el precio final.
- Mensajes finales de interfaz para cada resultado de revalidación.

## 12. Siguiente cambio recomendado

Crear un plan de implementación pequeño para `packages/domain`, comenzando por `Money`, reglas de
precios y configuración de modificadores en memoria. El plan deberá definir archivos, API pública,
casos de prueba y orden de commits antes de escribir el código.
