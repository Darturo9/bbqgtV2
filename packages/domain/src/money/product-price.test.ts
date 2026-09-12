import { describe, expect, it } from "vitest";

import { type DomainError } from "../shared/domain-error.js";
import { type Result } from "../shared/result.js";
import { createMoney, type Money } from "./money.js";
import {
  createProductPrice,
  getDiscountPercentage,
  getEffectivePrice,
  type ProductPrice,
} from "./product-price.js";

function getSuccess<T>(result: Result<T, DomainError>): T {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }

  return result.value;
}

function money(minorUnits: number): Money {
  return getSuccess(createMoney(minorUnits));
}

function price(input: Readonly<{ regular: Money; sale?: Money }>): ProductPrice {
  return getSuccess(createProductPrice(input));
}

describe("ProductPrice", () => {
  it("creates a regular price", () => {
    const regular = money(10_000);
    const productPrice = price({ regular });

    expect(productPrice).toEqual({ regular });
    expect(Object.isFrozen(productPrice)).toBe(true);
    expect(getEffectivePrice(productPrice)).toBe(regular);
    expect(getDiscountPercentage(productPrice)).toBeNull();
  });

  it("uses a lower sale price and derives its display percentage", () => {
    const regular = money(10_000);
    const sale = money(8_000);
    const productPrice = price({ regular, sale });

    expect(getEffectivePrice(productPrice)).toBe(sale);
    expect(getDiscountPercentage(productPrice)).toBe(20);
  });

  it("rounds the derived display percentage to the nearest integer", () => {
    const productPrice = price({ regular: money(9_999), sale: money(8_499) });

    expect(getDiscountPercentage(productPrice)).toBe(15);
  });

  it("derives a percentage without overflowing safe prices", () => {
    const regularMinorUnits = Number.MAX_SAFE_INTEGER;
    const productPrice = price({
      regular: money(regularMinorUnits),
      sale: money(Math.floor(regularMinorUnits / 2)),
    });

    expect(getDiscountPercentage(productPrice)).toBe(50);
  });

  it("rejects a zero regular price", () => {
    expect(createProductPrice({ regular: money(0) })).toEqual({
      ok: false,
      error: {
        code: "INVALID_PRODUCT_PRICE",
        path: "regular",
        details: { reason: "not_positive" },
      },
    });
  });

  it.each([
    [0, "not_positive"],
    [10_000, "not_lower_than_regular"],
    [12_000, "not_lower_than_regular"],
  ] as const)("rejects invalid sale price %s", (saleMinorUnits, reason) => {
    expect(createProductPrice({ regular: money(10_000), sale: money(saleMinorUnits) })).toEqual({
      ok: false,
      error: {
        code: "INVALID_PRODUCT_PRICE",
        path: "sale",
        details: { reason },
      },
    });
  });
});
