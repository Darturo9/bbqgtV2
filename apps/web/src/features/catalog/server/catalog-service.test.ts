import { describe, expect, it, vi } from "vitest";

import type { CatalogRepository, CatalogRepositoryResult } from "./catalog-repository";
import {
  createCatalogService,
  type CatalogFailureLogEntry,
  type CatalogServiceLogger,
} from "./catalog-service";
import type { CatalogSource } from "./catalog-source";
import { createConfiguredCatalogService } from "./create-catalog-service";
import { getCatalogCacheTag } from "./cached-catalog";

const VALID_SOURCE: CatalogSource = Object.freeze({
  brand: Object.freeze({
    id: "brand-bbqbros",
    slug: "bbqbros",
    name: "BBQBros",
    currencyCode: "GTQ",
  }),
  location: Object.freeze({
    id: "location-norte",
    brandId: "brand-bbqbros",
    slug: "sucursal-demo-norte",
    name: "Sucursal Demo Norte",
  }),
  categories: Object.freeze([
    Object.freeze({
      id: "category-combos",
      brandId: "brand-bbqbros",
      slug: "combos",
      name: "Combos",
      displayOrder: 10,
      isActive: true,
    }),
  ]),
  products: Object.freeze([
    Object.freeze({
      id: "product-combo-uno",
      brandId: "brand-bbqbros",
      categoryId: "category-combos",
      slug: "combo-uno",
      name: "Combo Uno",
      regularPriceCents: 10_000,
      displayOrder: 10,
      isActive: true,
    }),
  ]),
  modifierGroups: Object.freeze([]),
  modifierOptions: Object.freeze([]),
  categoryModifierGroups: Object.freeze([]),
  categoryModifierGroupExclusions: Object.freeze([]),
  productModifierGroups: Object.freeze([]),
  modifierConditions: Object.freeze([]),
  locationProducts: Object.freeze([
    Object.freeze({
      brandId: "brand-bbqbros",
      locationId: "location-norte",
      productId: "product-combo-uno",
      isAvailable: true,
    }),
  ]),
  locationModifierOptions: Object.freeze([]),
});

function repositoryReturning(result: CatalogRepositoryResult): CatalogRepository {
  return Object.freeze({ load: vi.fn().mockResolvedValue(result) });
}

function createLogger(): Readonly<{
  logger: CatalogServiceLogger;
  entries: CatalogFailureLogEntry[];
}> {
  const entries: CatalogFailureLogEntry[] = [];

  return Object.freeze({
    logger: Object.freeze({
      error(entry: CatalogFailureLogEntry) {
        entries.push(entry);
      },
    }),
    entries,
  });
}

describe("createCatalogService", () => {
  it("convierte una fuente encontrada con productos vendibles en success", async () => {
    const repository = repositoryReturning({ status: "found", source: VALID_SOURCE });
    const { logger, entries } = createLogger();
    const service = createCatalogService({ repository, logger });

    const result = await service.read("bbqbros", "sucursal-demo-norte");

    expect(repository.load).toHaveBeenCalledWith("bbqbros", "sucursal-demo-norte");
    expect(result).toMatchObject({
      status: "success",
      snapshot: {
        brand: { slug: "bbqbros" },
        location: { slug: "sucursal-demo-norte" },
        categories: [{ products: [{ slug: "combo-uno" }] }],
      },
    });
    expect(entries).toEqual([]);
  });

  it("convierte una fuente válida sin productos vendibles en empty", async () => {
    const source = Object.freeze({ ...VALID_SOURCE, locationProducts: Object.freeze([]) });
    const { logger, entries } = createLogger();
    const service = createCatalogService({
      repository: repositoryReturning({ status: "found", source }),
      logger,
    });

    const result = await service.read("bbqbros", "sucursal-demo-norte");

    expect(result).toEqual({
      status: "empty",
      brandName: "BBQBros",
      locationName: "Sucursal Demo Norte",
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(entries).toEqual([]);
  });

  it("conserva not_found cuando no existe la marca o la sede", async () => {
    const { logger, entries } = createLogger();
    const service = createCatalogService({
      repository: repositoryReturning({ status: "not_found" }),
      logger,
    });

    await expect(service.read("bbqbros", "sucursal-demo-norte")).resolves.toEqual({
      status: "not_found",
    });
    expect(entries).toEqual([]);
  });

  it("convierte un error del repositorio en failure y registra la causa solo en servidor", async () => {
    const internalCause = Object.freeze({ message: "detalle-interno-del-transporte" });
    const { logger, entries } = createLogger();
    const service = createCatalogService({
      repository: repositoryReturning({
        status: "failure",
        error: Object.freeze({
          code: "read_failed",
          operation: "catalog",
          cause: internalCause,
        }),
      }),
      logger,
    });

    const result = await service.read("bbqbros", "sucursal-demo-norte");

    expect(result).toMatchObject({ status: "failure", reference: expect.any(String) });
    expect(entries).toEqual([
      expect.objectContaining({
        event: "catalog_read_failed",
        stage: "repository",
        reference: result.status === "failure" ? result.reference : "",
        brandSlug: "bbqbros",
        locationSlug: "sucursal-demo-norte",
        cause: internalCause,
      }),
    ]);
  });

  it("convierte un error del mapper en failure y conserva la causa para el logger", async () => {
    const invalidSource = Object.freeze({
      ...VALID_SOURCE,
      brand: Object.freeze({ ...VALID_SOURCE.brand, currencyCode: "USD" }),
    });
    const { logger, entries } = createLogger();
    const service = createCatalogService({
      repository: repositoryReturning({ status: "found", source: invalidSource }),
      logger,
    });

    const result = await service.read("bbqbros", "sucursal-demo-norte");

    expect(result).toMatchObject({ status: "failure", reference: expect.any(String) });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      event: "catalog_read_failed",
      stage: "mapping",
      cause: {
        kind: "catalog_source_validation",
        path: "brand.currencyCode",
        reason: "unsupported_currency",
      },
    });
  });

  it("sanitiza el resultado público y genera una referencia opaca", async () => {
    const internalDetail = "postgres://usuario:secreto@host/base";
    const { logger } = createLogger();
    const service = createCatalogService({
      repository: repositoryReturning({
        status: "failure",
        error: Object.freeze({
          code: "read_failed",
          operation: "brand",
          cause: new Error(internalDetail),
        }),
      }),
      logger,
    });

    const result = await service.read("bbqbros", "sucursal-demo-norte");
    const serializedResult = JSON.stringify(result);

    expect(result).toMatchObject({
      status: "failure",
      reference: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    });
    expect(serializedResult).not.toContain(internalDetail);
    expect(serializedResult).not.toContain("read_failed");
    expect(serializedResult).not.toContain("brand");
  });

  it("también controla una excepción inesperada del repositorio", async () => {
    const repository: CatalogRepository = Object.freeze({
      load: vi.fn().mockRejectedValue(new Error("fallo inesperado")),
    });
    const { logger, entries } = createLogger();
    const service = createCatalogService({ repository, logger });

    const result = await service.read("bbqbros", "sucursal-demo-norte");

    expect(result).toMatchObject({ status: "failure", reference: expect.any(String) });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.stage).toBe("repository");
  });

  it("convierte una configuración ausente en un fallo operativo sanitizado", async () => {
    const { logger, entries } = createLogger();
    const service = createConfiguredCatalogService({ NODE_ENV: "test" }, logger);

    const result = await service.read("bbqbros", "sucursal-demo-norte");

    expect(result).toMatchObject({ status: "failure", reference: expect.any(String) });
    expect(JSON.stringify(result)).not.toContain("SUPABASE_URL");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      event: "catalog_read_failed",
      stage: "repository",
      cause: {
        name: "CatalogEnvironmentError",
        code: "missing",
        variableName: "SUPABASE_URL",
      },
    });
  });

  it("el logger real no imprime credenciales incluidas en una configuración inválida", async () => {
    const secret = "clave-que-no-debe-registrarse";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const service = createConfiguredCatalogService({
        NODE_ENV: "test",
        SUPABASE_URL: `https://usuario:${secret}@example.supabase.co`,
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-value",
        CATALOG_BRAND_SLUG: "bbqbros",
        CATALOG_LOCATION_SLUG: "sucursal-demo-norte",
      });

      await service.read("bbqbros", "sucursal-demo-norte");

      expect(consoleError).toHaveBeenCalledOnce();
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain("usuario");
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("getCatalogCacheTag", () => {
  it("aísla cada entrada por marca y sede", () => {
    expect(getCatalogCacheTag("bbqbros", "sucursal-demo-norte")).toBe(
      "catalog:bbqbros:sucursal-demo-norte",
    );
    expect(getCatalogCacheTag("bbqbros", "sucursal-demo-sur")).not.toBe(
      getCatalogCacheTag("bbqbros", "sucursal-demo-norte"),
    );
  });
});
