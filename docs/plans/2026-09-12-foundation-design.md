# Diseño fundacional de BBQBros V2

- Estado: aprobado
- Fecha: 2026-09-12
- Responsable técnico: Codex
- Alcance del documento: arquitectura, producto inicial y forma de trabajo

## 1. Propósito

BBQBros V2 reconstruirá de forma ordenada el sistema de pedidos a domicilio del restaurante. La
versión original se conservará intacta como referencia histórica y funcional. V2 no copiará archivos
ni comportamientos automáticamente: cada capacidad deberá entenderse, documentarse, justificarse y
validarse antes de incorporarse.

El objetivo no es reproducir toda la V1. El objetivo es llevar a producción un nuevo sistema
comprensible, reproducible, seguro y mantenible, con límites claros entre reglas del negocio,
interfaz, persistencia e integraciones externas.

Codex será el único agente de programación involucrado. El repositorio no tendrá configuraciones
paralelas para otros agentes.

## 2. Decisiones aprobadas

### Producto

- La plataforma será multimarcas desde el dominio y la base de datos.
- El primer lanzamiento habilitará únicamente BBQBROS.
- BWINGS se evaluará después de aproximadamente tres meses de operación estable de BBQBROS en
  producción.
- El primer lanzamiento aceptará únicamente pedidos a domicilio.
- El checkout será como invitado; no habrá cuentas de clientes en el MVP.
- Los únicos medios de pago iniciales serán efectivo contra entrega y tarjeta mediante NeoPay.
- FEL es obligatorio para el lanzamiento.
- FEL se solicitará cuando el restaurante confirme operativamente la orden.
- WhatsApp responderá automáticamente con un mensaje fijo y el enlace oficial para armar el pedido
  en la web.
- WhatsApp no interpretará productos, no mantendrá conversación con IA y no creará carritos ni
  órdenes.
- GoNau será obligatorio antes del lanzamiento, pero su adaptador real no se implementará hasta
  recibir y validar la documentación oficial.
- El sistema será multisedes para BBQBROS desde el primer lanzamiento.
- La sede se asignará automáticamente según cobertura, con corrección operativa auditada antes de
  confirmar la orden.

### Administración inicial

El panel administrativo del MVP incluirá solamente:

- categorías, productos, precios y disponibilidad;
- modificadores y opciones;
- sedes, horarios y cobertura;
- pedidos y transiciones de estado;
- usuarios internos y permisos;
- configuración mínima de marca;
- consulta operativa de pagos y FEL;
- configuración de GoNau cuando exista un contrato confirmado.

Quedan fuera del MVP empleos, solicitudes de eventos, reseñas, promociones avanzadas, analítica
compleja y gestión editorial extensa.

### Roles internos

- `platform_admin`: administración técnica excepcional de todas las marcas y sedes; no es un rol de
  operación cotidiana.
- `brand_admin`: administra catálogo, configuración y operación de una marca.
- `location_manager`: administra la operación de una sede asignada.
- `operator`: procesa pedidos dentro de una sede sin modificar configuración sensible.

Se aplicará mínimo privilegio en interfaz, servidor y RLS. La autorización no dependerá de metadatos
editables por el usuario. Los cambios sensibles deberán registrar quién los realizó, cuándo y por
qué.

## 3. Arquitectura general

V2 será un monorepo administrado con pnpm Workspaces y Turborepo.

```text
bbqbros-v2/
├── apps/
│   ├── web/                 # Next.js, desplegado en Vercel
│   └── integrations-api/    # NestJS, desplegado en Railway
├── packages/
│   ├── domain/              # Reglas puras del negocio
│   ├── contracts/           # Esquemas, DTO y eventos compartidos
│   ├── config/              # Configuración tipada por aplicación
│   └── testing/             # Factories, fixtures y utilidades
├── supabase/
│   ├── migrations/          # Única historia canónica del esquema
│   ├── seed/
│   └── tests/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── decisions/
│   ├── runbooks/
│   └── plans/
└── .github/workflows/
```

`apps/web` será responsable de la tienda, el checkout y los paneles internos.
`apps/integrations-api` protegerá credenciales y encapsulará NeoPay, FEL, WhatsApp y GoNau. Las
reglas del restaurante no vivirán dentro de componentes React, Server Actions ni controladores
NestJS; vivirán en `packages/domain`.

No se creará un tercer backend genérico mientras no aparezca una necesidad demostrable.

## 4. Ambientes y datos

V2 utilizará un Supabase completamente nuevo. La base original no se modificará.

- Desarrollo: Supabase local y desechable.
- Staging: proyecto Supabase independiente en la nube, con datos sintéticos e integraciones sandbox
  o simuladas.
- Producción: proyecto Supabase separado, con datos y credenciales reales.

`supabase/migrations` será la única fuente de verdad. Ninguna aplicación tendrá una carpeta
alternativa de migraciones. Un ambiente deberá poder reconstruirse desde cero mediante pasos
documentados.

La futura migración desde V1 será un proceso explícito, auditable e idempotente. Solo trasladará
datos que el negocio decida conservar. No se copiará el esquema histórico como punto de partida.

## 5. Flujo de una orden

El servidor será la autoridad de precios, disponibilidad, cobertura, tarifa y total. El navegador
nunca decidirá el importe final.

1. El cliente selecciona productos y proporciona sus datos de entrega.
2. El servidor vuelve a validar catálogo, modificadores, horario y cobertura.
3. Se asigna la sede según cobertura y prioridad configurada.
4. Se guarda una fotografía inmutable de nombres, precios, cantidades, modificadores, tarifa y datos
   relevantes.
5. Se crea una orden idempotente en `pending_confirmation`.
6. Para efectivo, el pago queda pendiente de cobro.
7. Para tarjeta, se registra el intento y se procesa NeoPay de manera idempotente.
8. El restaurante acepta o rechaza la orden.
9. Al confirmar, se solicita FEL.
10. Al estar lista, se solicita el despacho a GoNau o se usa la contingencia manual.
11. Los eventos de entrega actualizan el estado de entrega y el dominio decide cuándo completar la
    orden.

## 6. Estados separados

Pedido, pago, entrega y FEL tendrán estados independientes. No se utilizará una sola columna para
representar todo el proceso.

```text
Pedido:
pending_confirmation -> confirmed -> preparing -> ready -> completed
                     \-> cancelled

Pago en efectivo:
pending -> collected

Pago con tarjeta:
pending -> processing -> paid
                     \-> failed
                     \-> reversal_pending -> reversed

Entrega:
pending -> dispatch_requested -> assigned -> picked_up -> on_the_way -> delivered
                               \-> dispatch_failed

FEL:
not_requested -> pending -> issued
                      \-> failed
issued -> annulment_pending -> annulled
```

Las transiciones se validarán en el dominio. Una orden cancelada no podrá pasar a preparación; una
tarjeta no permitirá confirmación sin pago aprobado; un fallo de FEL no repetirá el cobro; y una
corrección manual sensible requerirá auditoría.

## 7. Integraciones y recuperación

Los efectos externos utilizarán un outbox en PostgreSQL. La transacción que modifique una orden
registrará también el trabajo pendiente. Railway procesará esos eventos de forma idempotente.

Una caída de WhatsApp, FEL o GoNau no deberá perder la acción ni obligar a crear otra orden. Cada
operación tendrá identificador de correlación, número de intentos, último error sanitizado y próxima
fecha de reintento. Los fallos definitivos aparecerán en una bandeja operativa; no habrá reintentos
infinitos y silenciosos.

GoNau se conectará mediante un puerto de despacho. Desarrollo y staging usarán un adaptador
simulado. El adaptador productivo esperará la documentación oficial sobre autenticación, endpoints,
idempotencia, webhooks, estados, cancelaciones, datos del motorista, tracking, límites, errores y
contingencia.

## 8. Seguridad y secretos

- Ningún secreto se guardará en Git, documentación, ejemplos o logs.
- Desarrollo, staging y producción tendrán credenciales separadas.
- La llave con privilegios elevados de Supabase nunca llegará al navegador.
- Toda tabla expuesta tendrá permisos mínimos y RLS explícita.
- Los webhooks se autenticarán y protegerán contra repetición.
- No se almacenarán tarjetas completas ni CVV.
- Los logs serán estructurados y sanitizados.
- La rotación y revocación de credenciales tendrá runbooks verificables.

## 9. Calidad y pruebas

El CI deberá ejecutar formato, lint estricto, TypeScript, pruebas, build, validación de migraciones
y escaneo de secretos.

- Dominio: pruebas unitarias exhaustivas y rápidas.
- Base de datos: migraciones reproducibles, RLS, funciones y restricciones.
- Contratos: compatibilidad entre web, API y proveedores.
- Integración: Supabase local y adaptadores simulados.
- E2E: flujos críticos de cliente y personal operativo.
- Staging: NeoPay y FEL sandbox; GoNau cuando exista acceso formal.

No se desactivarán reglas globalmente para hacer pasar CI. Las excepciones deberán ser pequeñas,
localizadas, justificadas y documentadas.

## 10. Documentación y gobierno del repositorio

El repositorio tendrá un único `AGENTS.md` canónico para Codex. Toda decisión arquitectónica
relevante se guardará como ADR. Las funcionalidades comenzarán con criterios de aceptación y
terminarán con pruebas, documentación y evidencia de verificación.

Producción requerirá promoción manual después de staging. El éxito no será solo que el código
compile: el sistema deberá poder reconstruirse, rastrear una orden completa y recuperarse de fallos
sin duplicar cobros, facturas o despachos.

## 11. Condiciones para incorporar BWINGS

BWINGS se evaluará después de aproximadamente tres meses de operación estable de BBQBROS. Antes de
activarla se revisarán al menos:

- estabilidad y disponibilidad;
- pedidos creados y completados;
- errores operativos;
- incidentes de cobro y reversa;
- emisiones y anulaciones FEL;
- desempeño de GoNau;
- volumen de soporte;
- aislamiento real por marca y sede.

La arquitectura multimarcas no implica construir anticipadamente páginas, catálogo, configuración
fiscal ni operación de BWINGS.

## 12. Asuntos aún abiertos

- Documentación y contrato técnico oficial de GoNau.
- Validación fiscal final del momento de emisión FEL con restaurante, contador y certificador.
- Sedes exactas que participarán en el lanzamiento y sus coberturas aprobadas.
- Proceso y alcance de migración de catálogo o datos desde V1.
- Criterios numéricos de estabilidad para habilitar BWINGS.

Estos asuntos no impiden crear la base técnica, pero sí bloquean sus respectivas integraciones o la
salida a producción.
