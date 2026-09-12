# `@bbqbros/integrations-api`

Aplicación NestJS que protegerá credenciales y ejecutará integraciones desde Railway.

## Responsabilidades

- NeoPay: cobro, recuperación por timeout y reversa.
- FEL: emisión, consulta y anulación.
- WhatsApp: respuesta fija y notificaciones transaccionales.
- GoNau: despacho y recepción de eventos mediante un adaptador documentado.
- Procesamiento idempotente del outbox.

No implementará decisiones de precios, cobertura o transiciones por su cuenta; esas reglas
pertenecen al dominio compartido. El scaffold NestJS se añadirá en un cambio posterior y separado.
