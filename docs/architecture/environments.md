# Ambientes

## Desarrollo local

Supabase local y adaptadores simulados. Los datos son sintéticos y desechables. Debe ser posible
destruir y reconstruir el ambiente sin intervención manual en la base de datos.

## Staging

Vercel, Railway y Supabase separados de producción. Utiliza sandbox de NeoPay y FEL cuando estén
disponibles. GoNau utilizará simulador hasta obtener un ambiente formal. No se copian secretos ni
datos personales productivos.

## Producción

Ambiente aislado con credenciales reales. Solo recibe una versión que pasó CI y fue verificada en
staging. El despliegue requiere promoción manual y evidencia.

## Reglas de promoción

```text
local -> CI -> staging -> validación -> aprobación -> producción
```

- Una migración se ensaya localmente y en staging antes de producción.
- Los archivos de ambiente contienen nombres y ejemplos, nunca valores reales.
- Una verificación local no se presenta como prueba productiva.
- Los cambios de pagos, FEL o entrega requieren un runbook y rollback.
- No se conectará V2 a la base Supabase de V1.
