# ADR-0002: dos aplicaciones desplegables

- Estado: accepted
- Fecha: 2026-09-12

## Contexto

Next.js encaja con la experiencia web; pagos, FEL, WhatsApp y GoNau necesitan un proceso de servidor
con secretos y comportamiento operativo propio.

## Decisión

Desplegar `apps/web` en Vercel y `apps/integrations-api` en Railway.

## Consecuencias

- Los contratos entre procesos deben estar versionados y autenticados.
- Las credenciales externas permanecen fuera de la web.
- No se añadirá otro servicio hasta demostrar su necesidad.
