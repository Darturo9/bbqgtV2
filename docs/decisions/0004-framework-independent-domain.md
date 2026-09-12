# ADR-0004: dominio independiente de frameworks

- Estado: accepted
- Fecha: 2026-09-12

## Contexto

V1 concentra reglas del negocio dentro de formularios, Server Actions, controladores y servicios
conectados a Supabase.

## Decisión

Mantener reglas puras en `packages/domain` y contratos de procesos en `packages/contracts`. React,
Next.js, NestJS, Supabase y proveedores serán capas externas.

## Consecuencias

- El dominio podrá probarse sin red o base de datos.
- Los adaptadores deberán traducir formatos externos.
- Se evita reutilizar tipos de proveedores como modelos del negocio.
