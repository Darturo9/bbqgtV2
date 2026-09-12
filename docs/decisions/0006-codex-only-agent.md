# ADR-0006: Codex como único agente

- Estado: accepted
- Fecha: 2026-09-12

## Contexto

V1 acumuló instrucciones y resultados de múltiples agentes, lo que contribuyó a decisiones
contradictorias y documentación dispersa.

## Decisión

Codex será el único agente de programación de V2. `AGENTS.md` en la raíz será la única instrucción
de agente dentro del repositorio.

## Consecuencias

- No se crearán archivos de Claude, OpenCode, Gemini u otros agentes.
- Codex explicará cada cambio y conservará trazabilidad en planes, ADR y commits.
- Una comprobación automática rechazará configuraciones de agentes paralelos.
