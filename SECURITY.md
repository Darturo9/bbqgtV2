# Seguridad

## Reporte

Los posibles incidentes o vulnerabilidades deben comunicarse directamente al propietario del
proyecto. No incluir credenciales, datos personales ni evidencia sensible en issues públicos o
mensajes de commit.

## Reglas mínimas

- Los secretos viven en gestores de cada plataforma y nunca en Git.
- Cada ambiente usa credenciales y datos independientes.
- El navegador nunca recibe llaves privilegiadas de Supabase o proveedores.
- Los logs se sanitizan antes de salir de la aplicación.
- Los webhooks se autentican y protegen contra repetición.
- No se almacenan números completos de tarjeta ni CVV.
- Toda credencial expuesta se considera comprometida y debe rotarse.

Los procedimientos detallados de respuesta y rotación se añadirán en `docs/runbooks` antes de
conectar proveedores reales.
