import { beforeAll, describe, expect, it } from "vitest";

import type { CatalogReadResult } from "../model/catalog-read-result";
import type { CatalogRepository } from "./catalog-repository";
import { createCatalogService, type CatalogService } from "./catalog-service";
import { readLocalSupabaseTestEnvironment } from "./local-supabase.test-support";
import { createSupabaseCatalogRepository } from "./supabase-catalog-repository";
import { createCatalogSupabaseClient } from "./supabase-client";

const BRAND_SLUG = "bbqbros";
const LOCATION_SLUG = "sucursal-demo-norte";

let repository: CatalogRepository;
let service: CatalogService;
let catalogResult: CatalogReadResult;

beforeAll(async () => {
  const environment = readLocalSupabaseTestEnvironment();
  const client = createCatalogSupabaseClient(environment);

  repository = createSupabaseCatalogRepository(client);
  service = createCatalogService({
    repository,
    logger: Object.freeze({
      error() {
        // Los detalles se validan por el resultado; no se imprimen credenciales en la prueba.
      },
    }),
  });
  catalogResult = await service.read(BRAND_SLUG, LOCATION_SLUG);
});

describe("catálogo público contra Supabase local", () => {
  it("lee por RLS usando únicamente la clave publicable actual", async () => {
    const environment = readLocalSupabaseTestEnvironment();

    expect(environment.supabasePublishableKey).toMatch(/^sb_publishable_/);
    await expect(repository.load(BRAND_SLUG, LOCATION_SLUG)).resolves.toMatchObject({
      status: "found",
    });
  });

  it("expone solo filas activas y relaciones disponibles de la sede", async () => {
    const result = await repository.load(BRAND_SLUG, LOCATION_SLUG);

    expect(result.status).toBe("found");

    if (result.status !== "found") {
      throw new Error("El seed local no produjo el catálogo esperado.");
    }

    expect(result.source.categories.map(({ name }) => name)).toEqual(["Combos de Prueba"]);
    expect(result.source.products.map(({ name }) => name)).toEqual([
      "Combo Clásico Demo",
      "Combo Oferta Demo",
    ]);
    expect(result.source.categories.every(({ isActive }) => isActive)).toBe(true);
    expect(result.source.products.every(({ isActive }) => isActive)).toBe(true);
    expect(result.source.modifierGroups.every(({ isActive }) => isActive)).toBe(true);
    expect(result.source.modifierOptions.every(({ isActive }) => isActive)).toBe(true);
    expect(result.source.locationProducts.every(({ isAvailable }) => isAvailable)).toBe(true);
    expect(result.source.locationModifierOptions.every(({ isAvailable }) => isAvailable)).toBe(
      true,
    );
  });

  it("construye el catálogo público ordenado y aplica la oferta efectiva", () => {
    expect(catalogResult.status).toBe("success");

    if (catalogResult.status !== "success") {
      throw new Error("El recorrido repositorio-servicio no produjo un catálogo público.");
    }

    expect(catalogResult.snapshot).toMatchObject({
      brand: { slug: BRAND_SLUG, name: "BBQBROS", currencyCode: "GTQ" },
      location: { slug: LOCATION_SLUG, name: "Sucursal Demo Norte" },
      categories: [
        {
          name: "Combos de Prueba",
          products: [
            {
              name: "Combo Clásico Demo",
              regularPriceCents: 6500,
              currentPriceCents: 6500,
              isOnOffer: false,
            },
            {
              name: "Combo Oferta Demo",
              regularPriceCents: 8000,
              currentPriceCents: 6990,
              isOnOffer: true,
            },
          ],
        },
      ],
    });
  });

  it("responde not_found para una marca desconocida", async () => {
    await expect(service.read("marca-desconocida", LOCATION_SLUG)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("responde not_found para una sede desconocida", async () => {
    await expect(service.read(BRAND_SLUG, "sede-desconocida")).resolves.toEqual({
      status: "not_found",
    });
  });
});
