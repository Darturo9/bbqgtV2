import { render, screen } from "@testing-library/react";
import { connection } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogLoading } from "@/features/catalog/components/catalog-content";
import { getCachedCatalog } from "@/features/catalog/server/cached-catalog";
import { readCatalogEnvironment } from "@/features/catalog/server/catalog-environment";
import { readCatalogFailure } from "@/features/catalog/server/create-catalog-service";

import { DynamicCatalog } from "./page";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/catalog/server/catalog-environment", () => ({
  readCatalogEnvironment: vi.fn(() => ({
    supabaseUrl: "http://127.0.0.1:54321",
    supabasePublishableKey: "sb_publishable_test-value",
    brandSlug: "bbqbros",
    locationSlug: "sucursal-demo-norte",
  })),
}));

vi.mock("@/features/catalog/server/cached-catalog", () => ({
  getCachedCatalog: vi.fn().mockResolvedValue({
    status: "empty",
    brandName: "BBQBros",
    locationName: "Sucursal Demo Norte",
  }),
}));

vi.mock("@/features/catalog/server/create-catalog-service", () => ({
  readCatalogFailure: vi.fn().mockResolvedValue({
    status: "failure",
    reference: "referencia-opaca",
  }),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resuelve el contenido dinámico del catálogo durante la petición", async () => {
    render(await DynamicCatalog());

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "No hay productos disponibles por ahora",
      }),
    ).toBeInTheDocument();
    expect(getCachedCatalog).toHaveBeenCalledWith("bbqbros", "sucursal-demo-norte");
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(readCatalogEnvironment).mock.invocationCallOrder[0]!,
    );
  });

  it("el fallback comunica que el menú está cargando", () => {
    render(<CatalogLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando el menú");
  });

  it("convierte una configuración inválida en el estado de fallo público", async () => {
    vi.mocked(readCatalogEnvironment).mockImplementationOnce(() => {
      throw new Error("sb_secret_no-debe-llegar-a-la-pagina");
    });

    render(await DynamicCatalog());

    expect(screen.getByRole("heading", { name: "No pudimos cargar el menú" })).toBeInTheDocument();
    expect(readCatalogFailure).toHaveBeenCalledWith(
      expect.any(Error),
      "unconfigured",
      "unconfigured",
    );
    expect(document.body).not.toHaveTextContent("sb_secret_no-debe-llegar-a-la-pagina");
  });
});
