import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createIdentifier,
  type BrandId,
  type IdentifierKind,
  type ProductId,
} from "./identifier.js";

const identifierCases = [
  ["brand", "brand-1"],
  ["location", "location-1"],
  ["category", "category-1"],
  ["product", "product-1"],
  ["modifierGroup", "modifier-group-1"],
  ["modifierOption", "modifier-option-1"],
] as const satisfies readonly (readonly [IdentifierKind, string])[];

describe("createIdentifier", () => {
  it.each(identifierCases)("creates a nominal %s identifier", (kind, externalValue) => {
    const result = createIdentifier(kind, externalValue);

    expect(result).toEqual({ ok: true, value: externalValue });
  });

  it("normalizes surrounding whitespace without replacing the external value", () => {
    const result = createIdentifier("product", "  external/Product:42  ");

    expect(result).toEqual({ ok: true, value: "external/Product:42" });
  });

  it.each(["", " ", "\n\t"])("rejects an empty identifier %#", (externalValue) => {
    const result = createIdentifier("brand", externalValue);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_IDENTIFIER",
        path: "brand",
        details: { reason: "empty" },
      },
    });
  });

  it("keeps identifier kinds distinct at compile time", () => {
    expectTypeOf<BrandId>().not.toEqualTypeOf<ProductId>();
  });
});
