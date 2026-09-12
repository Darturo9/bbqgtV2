# Contexto del sistema

## Componentes

```text
Cliente / Personal
        |
        v
 Web en Vercel ---------------------> Supabase
        |                                 ^
        | contratos autenticados          | persistencia / outbox
        v                                 |
 Integrations API en Railway -------------+
        |
        +--> NeoPay
        +--> Certificador FEL
        +--> WhatsApp
        +--> GoNau
```

## Límites

La web presenta información, recoge comandos y muestra resultados. No conserva credenciales de
proveedores ni decide reglas críticas en el navegador.

La API de integraciones ejecuta efectos externos y procesa el outbox. No redefine precios, cobertura
o estados: consulta y aplica contratos del dominio.

Supabase persiste el estado y aplica restricciones, permisos y RLS. Las migraciones del directorio
raíz constituyen la única historia del esquema.

Los proveedores son sistemas externos no confiables desde el punto de vista de disponibilidad y
formato. Cada uno tendrá un adaptador, timeout, idempotencia, sanitización y estrategia de
recuperación.

## Dependencias permitidas

- `apps/*` puede depender de `packages/*`.
- `packages/domain` no depende de aplicaciones, base de datos o proveedores.
- `packages/contracts` no importa SDK de proveedores.
- Un adaptador traduce datos externos antes de entregarlos al dominio.
- Ninguna aplicación mantiene una historia propia de migraciones.
