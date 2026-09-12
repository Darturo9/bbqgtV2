# Instrucciones de trabajo para Codex

## Autoridad

- Codex es el único agente de programación autorizado para este repositorio.
- No crear configuraciones, instrucciones ni artefactos para otros agentes.
- No delegar trabajo a subagentes ni mezclar resultados de otros agentes.
- El propietario conserva la decisión final sobre alcance, negocio, producción, credenciales, pagos,
  proveedores y acciones destructivas.

## Antes de cambiar archivos

1. Leer `README.md`, `docs/README.md` y la documentación relacionada.
2. Revisar `git status` y preservar cambios ajenos a la tarea.
3. Confirmar que la necesidad esté dentro del MVP aprobado.
4. Si falta una decisión de negocio que cambie el resultado, documentar el bloqueo y preguntar antes
   de implementar.
5. No copiar código de BBQBros V1 sin revisar su contrato, riesgos y pruebas.

## Implementación

- Trabajar en cambios pequeños, cohesivos y fáciles de revisar.
- Mantener las reglas del negocio fuera de React, controladores e integraciones.
- Usar `packages/domain` para reglas puras y `packages/contracts` para límites entre procesos.
- Mantener una sola historia de base de datos en `supabase/migrations`.
- Crear migraciones con Supabase CLI; no inventar nombres o timestamps.
- No implementar una API externa a partir de suposiciones. GoNau requiere documentación oficial
  aprobada.
- No introducir dependencias sin explicar propósito, mantenimiento y riesgo.
- No desactivar reglas de lint o tipos globalmente para hacer pasar CI.
- No incluir secretos, credenciales, datos reales de clientes ni tarjetas en código, fixtures,
  documentación, commits o logs.
- Todo efecto externo debe ser idempotente y tener una estrategia explícita de error, reintento y
  observabilidad.

## Verificación

- Ejecutar `pnpm check` antes de dar por terminado un cambio.
- Añadir pruebas proporcionales al riesgo y al comportamiento modificado.
- Para base de datos, verificar migraciones, permisos, RLS y reconstrucción local.
- Para pagos, FEL, WhatsApp o GoNau, usar sandbox o simuladores antes de staging y nunca probar
  productivo sin autorización explícita.
- Distinguir claramente validación local, staging y verificación productiva.

## Documentación y comunicación

- Explicar qué archivo se creó o cambió y por qué.
- Actualizar documentación y ADR cuando cambie una decisión o contrato.
- Usar español claro para documentación de negocio y operación.
- Usar nombres técnicos en inglés cuando formen parte del código o contratos.
- No declarar una integración o despliegue terminado sin evidencia verificable.

## Git

- La rama principal es `main`.
- Usar commits pequeños con mensajes Conventional Commits.
- No reescribir historia, forzar push, publicar, desplegar ni fusionar sin una solicitud explícita.
- No modificar el repositorio BBQBros V1 desde este proyecto.
