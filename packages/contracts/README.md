# `@bbqbros/contracts`

Esquemas y contratos versionados entre la web, la API de Railway, el outbox y los adaptadores
externos.

No contiene reglas del negocio ni DTO de proveedores externos. Esos datos se traducirán en los
límites de cada adaptador.

## Contrato de base de datos

`src/database.types.ts` se genera desde el esquema `public` de la base local mediante la CLI de
Supabase. Es un contrato interno versionado: no debe editarse manualmente.

Con Supabase local iniciado:

```bash
pnpm db:types
```

Para comprobar que las migraciones y el archivo versionado siguen sincronizados:

```bash
pnpm db:types:check
```

La entrada pública del paquete expone únicamente el tipo `Database`. `packages/domain` permanece
independiente de Supabase y de este contrato de infraestructura.
