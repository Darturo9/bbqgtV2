# ADR-0005: outbox para efectos externos

- Estado: accepted
- Fecha: 2026-09-12

## Contexto

NeoPay, FEL, WhatsApp y GoNau pueden fallar después de guardar una orden. Las llamadas directas sin
persistencia pueden perder eventos o repetir operaciones.

## Decisión

Registrar trabajos externos en un outbox de PostgreSQL dentro de la misma transacción del cambio de
negocio. Railway los procesará de manera idempotente.

## Consecuencias

- Los efectos pendientes sobreviven reinicios.
- Cada consumidor necesita idempotencia, reintentos limitados y estado de error.
- La operación requiere métricas y una bandeja para fallos definitivos.
