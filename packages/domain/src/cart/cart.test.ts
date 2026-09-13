import { describe, expect, it } from "vitest";

import { createModifierGroup, createModifierOption, type ModifierGroup } from "../catalog/model.js";
import { validateModifierSelection } from "../catalog/modifier-selection.js";
import { createMoney, createPriceAdjustment } from "../money/money.js";
import { createProductPrice, type ProductPrice } from "../money/product-price.js";
import { type DomainError } from "../shared/domain-error.js";
import { createIdentifier, type BrandId } from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import {
  addCartLine,
  calculateCartTotals,
  clearCart,
  createCart,
  isCartExpired,
  removeCartLine,
  updateCartLineQuantity,
  type AddCartLineInput,
} from "./cart.js";
import { createCartLineKey } from "./line-key.js";
import {
  CART_LIFETIME_MILLISECONDS,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY,
  type Cart,
} from "./model.js";

function getSuccess<T>(result: Result<T, DomainError>): T {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }

  return result.value;
}

function id<Kind extends Parameters<typeof createIdentifier>[0]>(kind: Kind, value: string) {
  return getSuccess(createIdentifier(kind, value));
}

const brandId = id("brand", "brand-1");
const otherBrandId = id("brand", "brand-2");
const locationId = id("location", "location-1");
const otherLocationId = id("location", "location-2");
const productId = id("product", "product-1");
const createdAt = Date.UTC(2026, 8, 12, 12);

function price(regularMinorUnits = 10_000, saleMinorUnits?: number): ProductPrice {
  const regular = getSuccess(createMoney(regularMinorUnits));

  return getSuccess(
    createProductPrice({
      regular,
      ...(saleMinorUnits === undefined ? {} : { sale: getSuccess(createMoney(saleMinorUnits)) }),
    }),
  );
}

function emptyCart(): Cart {
  return getSuccess(createCart({ brandId, locationId, createdAt }));
}

function input(overrides: Partial<AddCartLineInput> = {}): AddCartLineInput {
  return {
    brandId,
    locationId,
    productId,
    productPrice: price(),
    modifierSelections: [],
    quantity: 1,
    ...overrides,
  };
}

function group(
  value: string,
  optionFixtures: readonly Readonly<{ value: string; adjustment?: number }>[] = [
    { value: `${value}-option` },
  ],
  groupBrandId: BrandId = brandId,
): ModifierGroup {
  const groupId = id("modifierGroup", value);
  const options = optionFixtures.map((fixture, displayOrder) =>
    getSuccess(
      createModifierOption({
        id: id("modifierOption", fixture.value),
        brandId: groupBrandId,
        groupId,
        name: fixture.value,
        priceAdjustment: getSuccess(createPriceAdjustment(fixture.adjustment ?? 0)),
        displayOrder,
        isActive: true,
      }),
    ),
  );

  return getSuccess(
    createModifierGroup({
      id: groupId,
      brandId: groupBrandId,
      name: value,
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: options.length,
      displayOrder: 0,
      isActive: true,
      options,
    }),
  );
}

function optionAt(modifierGroup: ModifierGroup, index: number) {
  const option = modifierGroup.options[index];

  if (option === undefined) {
    throw new Error(`The fixture group requires option ${String(index)}`);
  }

  return option;
}

function addLine(cart: Cart, lineInput: AddCartLineInput): Cart {
  return getSuccess(addCartLine(cart, lineInput));
}

describe("cart", () => {
  it("creates an immutable empty cart that expires after 24 hours", () => {
    const cart = emptyCart();

    expect(cart).toEqual({
      brandId,
      locationId,
      createdAt,
      expiresAt: createdAt + CART_LIFETIME_MILLISECONDS,
      lines: [],
    });
    expect(Object.isFrozen(cart)).toBe(true);
    expect(Object.isFrozen(cart.lines)).toBe(true);
  });

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER])(
    "rejects invalid creation timestamp %s",
    (invalidCreatedAt) => {
      expect(createCart({ brandId, locationId, createdAt: invalidCreatedAt })).toMatchObject({
        ok: false,
        error: { code: "INVALID_CART", path: "createdAt" },
      });
    },
  );

  it("adds a configured line using the effective product price", () => {
    const modifierGroup = group("extras", [{ value: "bacon", adjustment: 500 }]);
    const selectedOption = optionAt(modifierGroup, 0);
    const selection = getSuccess(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [selectedOption.id],
      }),
    );
    const original = emptyCart();
    const cart = addLine(
      original,
      input({
        productPrice: price(10_000, 8_000),
        modifierSelections: [selection],
        quantity: 2,
        instructions: "  Sin   cebolla  ",
      }),
    );

    expect(original.lines).toEqual([]);
    expect(cart.lines).toMatchObject([
      {
        brandId,
        locationId,
        productId,
        unitPrice: { currency: "GTQ", minorUnits: 8_500 },
        quantity: 2,
        instructions: "Sin cebolla",
      },
    ]);
    expect(Object.isFrozen(cart.lines[0])).toBe(true);
    expect(Object.isFrozen(cart.lines[0]?.modifierSelections)).toBe(true);
  });

  it("combines identical configurations after instruction normalization", () => {
    const first = addLine(emptyCart(), input({ quantity: 2, instructions: "Sin   cebolla" }));
    const combined = addLine(first, input({ quantity: 3, instructions: "  Sin cebolla  " }));

    expect(combined.lines).toHaveLength(1);
    expect(combined.lines[0]?.quantity).toBe(5);
    expect(first.lines[0]?.quantity).toBe(2);
  });

  it("keeps different options or instructions in separate lines", () => {
    const modifierGroup = group("protein", [{ value: "chicken" }, { value: "brisket" }]);
    const chicken = getSuccess(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [optionAt(modifierGroup, 0).id],
      }),
    );
    const brisket = getSuccess(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [optionAt(modifierGroup, 1).id],
      }),
    );
    const withChicken = addLine(emptyCart(), input({ modifierSelections: [chicken] }));
    const withBrisket = addLine(withChicken, input({ modifierSelections: [brisket] }));
    const withInstructions = addLine(
      withBrisket,
      input({ modifierSelections: [chicken], instructions: "Salsa aparte" }),
    );

    expect(withInstructions.lines).toHaveLength(3);
  });

  it("does not combine the same configuration when its current price changed", () => {
    const cart = addLine(emptyCart(), input({ productPrice: price(10_000) }));

    expect(addCartLine(cart, input({ productPrice: price(10_100) }))).toMatchObject({
      ok: false,
      error: { code: "CART_LINE_PRICE_MISMATCH" },
    });
  });

  it("rejects lines from another brand or location", () => {
    const cart = emptyCart();

    expect(addCartLine(cart, input({ brandId: otherBrandId }))).toMatchObject({
      ok: false,
      error: { code: "CART_BRAND_MISMATCH" },
    });
    expect(addCartLine(cart, input({ locationId: otherLocationId }))).toMatchObject({
      ok: false,
      error: { code: "CART_LOCATION_MISMATCH" },
    });
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid added quantity %s", (quantity) => {
    expect(addCartLine(emptyCart(), input({ quantity }))).toMatchObject({
      ok: false,
      error: { code: "INVALID_CART_LINE" },
    });
  });

  it("enforces the maximum quantity per line", () => {
    expect(addCartLine(emptyCart(), input({ quantity: MAX_CART_LINE_QUANTITY + 1 }))).toMatchObject(
      { ok: false, error: { code: "CART_LINE_LIMIT_EXCEEDED" } },
    );

    const cart = addLine(emptyCart(), input({ quantity: 15 }));
    expect(addCartLine(cart, input({ quantity: 6 }))).toMatchObject({
      ok: false,
      error: { code: "CART_LINE_LIMIT_EXCEEDED" },
    });
  });

  it("enforces the maximum total quantity in the cart", () => {
    const first = addLine(emptyCart(), input({ productId: id("product", "first"), quantity: 20 }));
    const second = addLine(first, input({ productId: id("product", "second"), quantity: 20 }));
    const full = addLine(
      second,
      input({
        productId: id("product", "third"),
        quantity: MAX_CART_TOTAL_QUANTITY - 40,
      }),
    );

    expect(
      addCartLine(full, input({ productId: id("product", "fourth"), quantity: 1 })),
    ).toMatchObject({ ok: false, error: { code: "CART_TOTAL_LIMIT_EXCEEDED" } });
  });

  it("updates quantities and removes a line when reduced to zero", () => {
    const cart = addLine(emptyCart(), input({ quantity: 2 }));
    const lineKey = cart.lines[0]?.key;

    if (lineKey === undefined) {
      throw new Error("The fixture cart requires a line");
    }

    const updated = getSuccess(updateCartLineQuantity(cart, { lineKey, quantity: 5 }));
    const removed = getSuccess(updateCartLineQuantity(updated, { lineKey, quantity: 0 }));

    expect(updated.lines[0]?.quantity).toBe(5);
    expect(cart.lines[0]?.quantity).toBe(2);
    expect(removed.lines).toEqual([]);
  });

  it("enforces valid quantities when updating a line", () => {
    const cart = addLine(emptyCart(), input());
    const lineKey = cart.lines[0]?.key;

    if (lineKey === undefined) {
      throw new Error("The fixture cart requires a line");
    }

    expect(updateCartLineQuantity(cart, { lineKey, quantity: -1 })).toMatchObject({
      ok: false,
      error: { code: "INVALID_CART_LINE" },
    });
    expect(
      updateCartLineQuantity(cart, {
        lineKey,
        quantity: MAX_CART_LINE_QUANTITY + 1,
      }),
    ).toMatchObject({ ok: false, error: { code: "CART_LINE_LIMIT_EXCEEDED" } });
  });

  it("rejects updates that exceed the cart total", () => {
    const firstProductId = id("product", "update-first");
    const secondProductId = id("product", "update-second");
    const thirdProductId = id("product", "update-third");
    const first = addLine(emptyCart(), input({ productId: firstProductId, quantity: 20 }));
    const second = addLine(first, input({ productId: secondProductId, quantity: 20 }));
    const full = addLine(second, input({ productId: thirdProductId, quantity: 10 }));
    const thirdLineKey = full.lines.find((line) => line.productId === thirdProductId)?.key;

    if (thirdLineKey === undefined) {
      throw new Error("The fixture cart requires its third line");
    }

    expect(updateCartLineQuantity(full, { lineKey: thirdLineKey, quantity: 11 })).toMatchObject({
      ok: false,
      error: { code: "CART_TOTAL_LIMIT_EXCEEDED" },
    });
  });

  it("rejects an update for an unknown line", () => {
    const unknownKey = createCartLineKey({
      productId: id("product", "unknown"),
      modifierSelections: [],
    });

    expect(updateCartLineQuantity(emptyCart(), { lineKey: unknownKey, quantity: 1 })).toMatchObject(
      {
        ok: false,
        error: { code: "CART_LINE_NOT_FOUND" },
      },
    );
  });

  it("removes and clears lines without mutating the previous cart", () => {
    const firstProductId = id("product", "remove-first");
    const secondProductId = id("product", "remove-second");
    const first = addLine(emptyCart(), input({ productId: firstProductId }));
    const complete = addLine(first, input({ productId: secondProductId }));
    const firstLineKey = complete.lines.find((line) => line.productId === firstProductId)?.key;

    if (firstLineKey === undefined) {
      throw new Error("The fixture cart requires its first line");
    }

    const removed = removeCartLine(complete, firstLineKey);
    const cleared = clearCart(removed);

    expect(complete.lines).toHaveLength(2);
    expect(removed.lines.map((line) => line.productId)).toEqual([secondProductId]);
    expect(cleared.lines).toEqual([]);
  });

  it("returns the same cart when removing an unknown line or clearing an empty cart", () => {
    const cart = emptyCart();
    const unknownKey = createCartLineKey({
      productId: id("product", "unknown-noop"),
      modifierSelections: [],
    });

    expect(removeCartLine(cart, unknownKey)).toBe(cart);
    expect(clearCart(cart)).toBe(cart);
  });

  it("derives line subtotals, cart quantity and subtotal", () => {
    const first = addLine(
      emptyCart(),
      input({ productId: id("product", "totals-first"), productPrice: price(1_000), quantity: 2 }),
    );
    const cart = addLine(
      first,
      input({ productId: id("product", "totals-second"), productPrice: price(2_500), quantity: 3 }),
    );
    const totals = getSuccess(calculateCartTotals(cart));

    expect(totals).toMatchObject({
      totalQuantity: 5,
      lineSubtotals: [
        { subtotal: { currency: "GTQ", minorUnits: 2_000 } },
        { subtotal: { currency: "GTQ", minorUnits: 7_500 } },
      ],
      subtotal: { currency: "GTQ", minorUnits: 9_500 },
    });
    expect(Object.isFrozen(totals)).toBe(true);
    expect(Object.isFrozen(totals.lineSubtotals)).toBe(true);
  });

  it("rejects a cart line whose subtotal would overflow", () => {
    expect(
      addCartLine(
        emptyCart(),
        input({ productPrice: price(Number.MAX_SAFE_INTEGER), quantity: 2 }),
      ),
    ).toMatchObject({ ok: false, error: { code: "MONEY_OVERFLOW" } });
  });

  it("rejects duplicate selection groups and modifier options from another brand", () => {
    const localGroup = group("duplicate-selection");
    const localSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: localGroup,
        optionIds: [optionAt(localGroup, 0).id],
      }),
    );

    expect(
      addCartLine(emptyCart(), input({ modifierSelections: [localSelection, localSelection] })),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_CART_LINE", details: { reason: "duplicate_modifier_group" } },
    });

    const foreignGroup = group("foreign-selection", undefined, otherBrandId);
    const foreignSelection = getSuccess(
      validateModifierSelection({
        brandId: otherBrandId,
        group: foreignGroup,
        optionIds: [optionAt(foreignGroup, 0).id],
      }),
    );
    expect(
      addCartLine(emptyCart(), input({ modifierSelections: [foreignSelection] })),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_CART_LINE", details: { reason: "modifier_brand_mismatch" } },
    });
  });

  it("evaluates expiration against the supplied clock", () => {
    const cart = emptyCart();

    expect(isCartExpired(cart, cart.expiresAt - 1)).toBe(false);
    expect(isCartExpired(cart, cart.expiresAt)).toBe(true);
    expect(isCartExpired(cart, cart.expiresAt + 1)).toBe(true);
  });
});
