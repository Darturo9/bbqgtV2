# Contribuir a BBQBros V2

## Flujo de trabajo

1. Leer `AGENTS.md` y la documentación del área afectada.
2. Crear o actualizar un plan cuando el cambio altere comportamiento o arquitectura.
3. Implementar la unidad más pequeña que entregue comportamiento verificable.
4. Ejecutar `pnpm check`.
5. Revisar el diff y confirmar que no contiene secretos ni archivos generados.
6. Crear un commit Conventional Commit.

## Definición de terminado

Un cambio está terminado cuando:

- cumple criterios de aceptación documentados;
- conserva las reglas del dominio;
- tiene pruebas proporcionales al riesgo;
- pasa los controles del repositorio;
- actualiza documentación y contratos relacionados;
- distingue lo verificado localmente de lo pendiente en staging o producción.

Compilar no demuestra por sí solo que un cambio esté listo para producción.
