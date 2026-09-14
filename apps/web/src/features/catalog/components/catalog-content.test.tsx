import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogReadResult } from "../model/catalog-read-result";
import type { CatalogSnapshot } from "../model/catalog-snapshot";
import { CatalogContent } from "./catalog-content";

const SNAPSHOT: CatalogSnapshot = Object.freeze({
  brand: Object.freeze({
    id: "brand-bbqbros",
    slug: "bbqbros",
    name: "BBQBros",
    currencyCode: "GTQ",
  }),
  location: Object.freeze({
    id: "location-norte",
    slug: "sucursal-demo-norte",
    name: "Sucursal Demo Norte",
  }),
  categories: Object.freeze([
    Object.freeze({
      id: "category-combos",
      slug: "combos",
      name: "Combos",
      products: Object.freeze([
        Object.freeze({
          id: "product-combo-uno",
          slug: "combo-uno",
          name: "Combo Uno",
          regularPriceCents: 10_000,
          currentPriceCents: 10_000,
          isOnOffer: false,
          image: Object.freeze({ kind: "placeholder", alt: "Combo Uno de BBQBROS" }),
          isCustomizable: false,
        }),
      ]),
    }),
  ]),
});

function renderResult(result: CatalogReadResult) {
  return render(<CatalogContent result={result} />);
}

describe("CatalogContent", () => {
  it("presenta marca, sede, categorías semánticas y listas de productos", () => {
    renderResult({ status: "success", snapshot: SNAPSHOT });

    expect(screen.getByRole("heading", { level: 1, name: "Menú a domicilio" })).toBeInTheDocument();
    expect(screen.getAllByText("BBQBros")).toHaveLength(2);
    expect(screen.getAllByText("BBQBros")[0]).toHaveClass("font-brand");
    expect(screen.getByText("Sucursal Demo Norte")).toBeInTheDocument();

    const section = screen.getByRole("region", { name: "Combos" });
    expect(within(section).getByRole("heading", { level: 2, name: "Combos" })).toBeInTheDocument();
    expect(within(section).getByRole("list", { name: "Productos de Combos" })).toBeInTheDocument();
    expect(within(section).getByRole("article", { name: "Combo Uno" })).toBeInTheDocument();
  });

  it("no presenta categorías vacías dentro de un catálogo exitoso", () => {
    renderResult({
      status: "success",
      snapshot: {
        ...SNAPSHOT,
        categories: [
          ...SNAPSHOT.categories,
          { id: "category-empty", slug: "vacia", name: "Vacía", products: [] },
        ],
      },
    });

    expect(screen.queryByRole("heading", { name: "Vacía" })).not.toBeInTheDocument();
  });

  it.each([
    [
      { status: "empty", brandName: "BBQBros", locationName: "Sucursal Demo Norte" } as const,
      "No hay productos disponibles por ahora",
      "El menú de BBQBros en Sucursal Demo Norte está temporalmente vacío.",
    ],
    [
      { status: "not_found" } as const,
      "Este menú no está disponible",
      "No encontramos una marca y sede públicas con esta configuración.",
    ],
    [
      { status: "failure", reference: "falla-opaca-123" } as const,
      "No pudimos cargar el menú",
      "Puedes recargar la página para intentarlo nuevamente.",
    ],
  ])("distingue cada estado operativo", (result, heading, description) => {
    renderResult(result);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("permite reintentar un fallo sin exponer detalles técnicos", () => {
    renderResult({ status: "failure", reference: "falla-opaca-123" });

    expect(screen.getByRole("button", { name: "Reintentar carga" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(screen.getByText("Referencia: falla-opaca-123")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("SUPABASE_PUBLISHABLE_KEY");
    expect(document.body).not.toHaveTextContent("sb_secret_");
    expect(document.body).not.toHaveTextContent("PostgREST");
  });
});
