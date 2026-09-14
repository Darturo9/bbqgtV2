import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogProduct } from "../model/catalog-snapshot";
import { ProductCard } from "./product-card";

const PRODUCT: CatalogProduct = Object.freeze({
  id: "product-combo-uno",
  slug: "combo-uno",
  name: "Combo Uno",
  description: "Costillas, papas y bebida.",
  regularPriceCents: 10_000,
  currentPriceCents: 10_000,
  isOnOffer: false,
  image: Object.freeze({ kind: "placeholder", alt: "Combo Uno de BBQBROS" }),
  isCustomizable: false,
});

describe("ProductCard", () => {
  it("muestra nombre, descripción opcional y precio vigente", () => {
    render(<ProductCard product={PRODUCT} />);

    const card = screen.getByRole("article", { name: "Combo Uno" });

    expect(within(card).getByRole("heading", { level: 3, name: "Combo Uno" })).toBeInTheDocument();
    expect(within(card).getByText("Costillas, papas y bebida.")).toBeInTheDocument();
    expect(within(card).getByLabelText("Precio Q 100.00")).toBeInTheDocument();
  });

  it("omite la descripción cuando el producto no tiene una", () => {
    render(<ProductCard product={{ ...PRODUCT, description: undefined }} />);

    expect(screen.queryByText("Costillas, papas y bebida.")).not.toBeInTheDocument();
  });

  it("comunica una oferta con precio actual y precio normal tachado", () => {
    render(<ProductCard product={{ ...PRODUCT, currentPriceCents: 8_500, isOnOffer: true }} />);

    const price = screen.getByLabelText("Precio de oferta Q 85.00; precio normal Q 100.00");

    expect(price).toBeInTheDocument();
    expect(within(price).getByText("Q 85.00")).toBeInTheDocument();
    expect(within(price).getByText("Q 100.00").tagName).toBe("DEL");
    expect(within(price).getByText("Oferta")).toBeInTheDocument();
  });

  it("muestra Personalizable cuando existen modificadores disponibles", () => {
    render(<ProductCard product={{ ...PRODUCT, isCustomizable: true }} />);

    expect(screen.getByText("Personalizable")).toBeInTheDocument();
  });

  it("presenta el placeholder de marca sin fingir una fotografía", () => {
    render(<ProductCard product={PRODUCT} />);

    expect(screen.getByRole("img", { name: "Combo Uno de BBQBROS" })).toHaveTextContent("BBQBROS");
  });

  it("presenta una imagen pública con texto alternativo", () => {
    render(
      <ProductCard
        product={{
          ...PRODUCT,
          image: {
            kind: "public",
            src: "https://example.supabase.co/storage/v1/object/public/catalog/combo.webp",
            alt: "Combo Uno de BBQBROS",
          },
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Combo Uno de BBQBROS" })).toHaveAttribute(
      "src",
      expect.stringContaining("combo.webp"),
    );
  });
});
