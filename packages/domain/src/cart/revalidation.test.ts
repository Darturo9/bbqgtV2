import { describe, expect, it } from "vitest";

import { type LocationAvailability } from "../catalog/availability.js";
import {
  validateModifierConditions,
  type ModifierCondition,
} from "../catalog/modifier-conditions.js";
import { createModifierGroup, createModifierOption, type ModifierGroup } from "../catalog/model.js";
import {
  validateModifierSelection,
  type ValidatedModifierSelection,
} from "../catalog/modifier-selection.js";
import { createMoney, createPriceAdjustment } from "../money/money.js";
import { createProductPrice, type ProductPrice } from "../money/product-price.js";
import { type DomainError } from "../shared/domain-error.js";
import {
  createIdentifier,
  type BrandId,
  type LocationId,
  type ModifierOptionId,
  type ProductId,
} from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import { addCartLine, createCart } from "./cart.js";
import { type Cart } from "./model.js";
import {
  CART_REVALIDATION_ISSUE_CODES,
  revalidateCart,
  type CartRevalidationProduct,
} from "./revalidation.js";

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
const originalLocationId = id("location", "location-1");
const currentLocationId = id("location", "location-2");
const firstProductId = id("product", "product-1");
const secondProductId = id("product", "product-2");
const createdAt = Date.UTC(2026, 8, 12, 12);

type GroupOptionFixture = Readonly<{
  value: string;
  adjustment?: number;
  isActive?: boolean;
}>;

function price(regularMinorUnits = 10_000, saleMinorUnits?: number): ProductPrice {
  return getSuccess(
    createProductPrice({
      regular: getSuccess(createMoney(regularMinorUnits)),
      ...(saleMinorUnits === undefined ? {} : { sale: getSuccess(createMoney(saleMinorUnits)) }),
    }),
  );
}

function group(
  value: string,
  options: readonly GroupOptionFixture[] = [{ value: `${value}-option` }],
  overrides: Partial<{
    brandId: BrandId;
    minSelections: number;
    maxSelections: number;
    isActive: boolean;
  }> = {},
): ModifierGroup {
  const groupId = id("modifierGroup", value);
  const groupBrandId = overrides.brandId ?? brandId;
  const modifierOptions = options.map((option, displayOrder) =>
    getSuccess(
      createModifierOption({
        id: id("modifierOption", option.value),
        brandId: groupBrandId,
        groupId,
        name: option.value,
        priceAdjustment: getSuccess(createPriceAdjustment(option.adjustment ?? 0)),
        displayOrder,
        isActive: option.isActive ?? true,
      }),
    ),
  );

  return getSuccess(
    createModifierGroup({
      id: groupId,
      brandId: groupBrandId,
      name: value,
      selectionType: overrides.maxSelections === 1 ? "single" : "multiple",
      minSelections: overrides.minSelections ?? 0,
      maxSelections:
        overrides.maxSelections ?? modifierOptions.filter((option) => option.isActive).length,
      displayOrder: 0,
      isActive: overrides.isActive ?? true,
      options: modifierOptions,
    }),
  );
}

function optionId(modifierGroup: ModifierGroup, index = 0): ModifierOptionId {
  const option = modifierGroup.options[index];

  if (option === undefined) {
    throw new Error(`The fixture group requires option ${String(index)}`);
  }

  return option.id;
}

function selection(
  modifierGroup: ModifierGroup,
  optionIds: readonly ModifierOptionId[] = [optionId(modifierGroup)],
  selectionBrandId = brandId,
): ValidatedModifierSelection {
  return getSuccess(
    validateModifierSelection({
      brandId: selectionBrandId,
      group: modifierGroup,
      optionIds,
    }),
  );
}

function product(
  productId: ProductId,
  productPrice: ProductPrice = price(),
  modifierGroups: readonly ModifierGroup[] = [],
  conditions: readonly ModifierCondition[] = [],
  overrides: Partial<{ brandId: BrandId; isActive: boolean }> = {},
): CartRevalidationProduct {
  const productBrandId = overrides.brandId ?? brandId;

  return {
    id: productId,
    brandId: productBrandId,
    isActive: overrides.isActive ?? true,
    price: productPrice,
    modifierGroups,
    conditionGraph: getSuccess(
      validateModifierConditions({
        brandId: productBrandId,
        groups: modifierGroups,
        conditions,
      }),
    ),
  };
}

function availability(
  availableProductIds: readonly ProductId[],
  availableModifierOptionIds: readonly ModifierOptionId[] = [],
  overrides: Partial<{ brandId: BrandId; locationId: LocationId }> = {},
): LocationAvailability {
  return {
    brandId: overrides.brandId ?? brandId,
    locationId: overrides.locationId ?? originalLocationId,
    availableProductIds,
    availableModifierOptionIds,
  };
}

function emptyCart(): Cart {
  return getSuccess(createCart({ brandId, locationId: originalLocationId, createdAt }));
}

function addLine(
  cart: Cart,
  productId: ProductId,
  productPrice: ProductPrice = price(),
  modifierSelections: readonly ValidatedModifierSelection[] = [],
): Cart {
  return getSuccess(
    addCartLine(cart, {
      brandId,
      locationId: cart.locationId,
      productId,
      productPrice,
      modifierSelections,
      quantity: 1,
    }),
  );
}

function revalidate(
  cart: Cart,
  products: readonly CartRevalidationProduct[],
  locationAvailability: LocationAvailability,
  overrides: Partial<{ brandId: BrandId; locationId: LocationId }> = {},
) {
  return revalidateCart({
    cart,
    brandId: overrides.brandId ?? brandId,
    locationId: overrides.locationId ?? originalLocationId,
    products,
    locationAvailability,
  });
}

describe("cart revalidation", () => {
  it("returns the original cart when nothing changed", () => {
    const cart = addLine(emptyCart(), firstProductId);
    const report = getSuccess(
      revalidate(cart, [product(firstProductId)], availability([firstProductId])),
    );

    expect(report).toMatchObject({
      issues: [],
      removedLineKeys: [],
      requiresCustomerAcceptance: false,
    });
    expect(report.proposedCart).toBe(cart);
  });

  it.each([
    ["regular", price(10_000), price(11_000), 10_000, 11_000],
    ["sale", price(10_000, 8_000), price(10_000, 7_500), 8_000, 7_500],
  ] as const)(
    "detects a changed %s price and updates only the proposal",
    (_kind, previousPrice, currentPrice, previousMinorUnits, currentMinorUnits) => {
      const cart = addLine(emptyCart(), firstProductId, previousPrice);
      const report = getSuccess(
        revalidate(cart, [product(firstProductId, currentPrice)], availability([firstProductId])),
      );

      expect(report.issues).toMatchObject([
        {
          code: CART_REVALIDATION_ISSUE_CODES.priceChanged,
          previousUnitPrice: { minorUnits: previousMinorUnits },
          currentUnitPrice: { minorUnits: currentMinorUnits },
        },
      ]);
      expect(report.proposedCart.lines[0]?.unitPrice.minorUnits).toBe(currentMinorUnits);
      expect(cart.lines[0]?.unitPrice.minorUnits).toBe(previousMinorUnits);
      expect(report.requiresCustomerAcceptance).toBe(true);
    },
  );

  it("removes a product that no longer exists in the catalog", () => {
    const cart = addLine(emptyCart(), firstProductId);
    const lineKey = cart.lines[0]?.key;
    const report = getSuccess(revalidate(cart, [], availability([firstProductId])));

    expect(report.issues).toMatchObject([
      { code: CART_REVALIDATION_ISSUE_CODES.productNotFound, productId: firstProductId },
    ]);
    expect(report.removedLineKeys).toEqual([lineKey]);
    expect(report.proposedCart.lines).toEqual([]);
    expect(cart.lines).toHaveLength(1);
  });

  it("reports all reasons for a product that is no longer available", () => {
    const cart = addLine(emptyCart(), firstProductId);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(), [], [], { isActive: false })],
        availability([]),
      ),
    );

    expect(report.issues).toMatchObject([
      {
        code: CART_REVALIDATION_ISSUE_CODES.productNotAvailable,
        productId: firstProductId,
        reasons: ["product_inactive", "product_unavailable"],
      },
    ]);
    expect(report.proposedCart.lines).toEqual([]);
  });

  it("removes a line when one of its selected options is unavailable", () => {
    const extras = group("extras", [{ value: "bacon", adjustment: 500 }]);
    const selectedExtras = selection(extras);
    const cart = addLine(emptyCart(), firstProductId, price(), [selectedExtras]);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(), [extras])],
        availability([firstProductId]),
      ),
    );

    expect(report.issues).toMatchObject([
      {
        code: CART_REVALIDATION_ISSUE_CODES.optionNotAvailable,
        optionIds: [optionId(extras)],
      },
    ]);
    expect(report.proposedCart.lines).toEqual([]);
  });

  it("detects a newly required selection", () => {
    const oldOptionalGroup = group("side", [{ value: "fries" }], {
      minSelections: 0,
      maxSelections: 1,
    });
    const currentRequiredGroup = group("side", [{ value: "fries" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const cart = addLine(emptyCart(), firstProductId, price(), []);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(), [currentRequiredGroup])],
        availability([firstProductId], [optionId(oldOptionalGroup)]),
      ),
    );

    expect(report.issues).toMatchObject([
      {
        code: CART_REVALIDATION_ISSUE_CODES.selectionInvalid,
        groupIds: [currentRequiredGroup.id],
      },
    ]);
    expect(report.proposedCart.lines).toEqual([]);
  });

  it("detects a required child group activated by a retained parent selection", () => {
    const parent = group("combo", [{ value: "make-combo" }], { maxSelections: 1 });
    const child = group("side", [{ value: "combo-fries" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const parentSelection = selection(parent);
    const condition: ModifierCondition = {
      brandId,
      parentGroupId: parent.id,
      activatingOptionId: optionId(parent),
      childGroupId: child.id,
    };
    const cart = addLine(emptyCart(), firstProductId, price(), [parentSelection]);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(), [parent, child], [condition])],
        availability([firstProductId], [optionId(parent), optionId(child)]),
      ),
    );

    expect(report.issues).toMatchObject([
      {
        code: CART_REVALIDATION_ISSUE_CODES.selectionInvalid,
        groupIds: [child.id],
      },
    ]);
  });

  it("rejects a retained selection whose conditional group is no longer active", () => {
    const parent = group("new-parent", [{ value: "new-trigger" }], { maxSelections: 1 });
    const child = group("previously-root", [{ value: "retained-child-option" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const childSelection = selection(child);
    const condition: ModifierCondition = {
      brandId,
      parentGroupId: parent.id,
      activatingOptionId: optionId(parent),
      childGroupId: child.id,
    };
    const cart = addLine(emptyCart(), firstProductId, price(), [childSelection]);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(), [parent, child], [condition])],
        availability([firstProductId], [optionId(parent), optionId(child)]),
      ),
    );

    expect(report.issues).toMatchObject([
      {
        code: CART_REVALIDATION_ISSUE_CODES.selectionInvalid,
        groupIds: [child.id],
      },
    ]);
    expect(report.proposedCart.lines).toEqual([]);
  });

  it("proposes a new location without mutating the original cart", () => {
    const cart = addLine(emptyCart(), firstProductId);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId)],
        availability([firstProductId], [], { locationId: currentLocationId }),
        { locationId: currentLocationId },
      ),
    );

    expect(report.issues).toMatchObject([
      {
        code: CART_REVALIDATION_ISSUE_CODES.locationChanged,
        previousLocationId: originalLocationId,
        currentLocationId,
      },
    ]);
    expect(report.proposedCart.locationId).toBe(currentLocationId);
    expect(report.proposedCart.lines[0]?.locationId).toBe(currentLocationId);
    expect(cart.locationId).toBe(originalLocationId);
    expect(cart.lines[0]?.locationId).toBe(originalLocationId);
  });

  it("accumulates differences across lines in deterministic order", () => {
    const first = addLine(emptyCart(), firstProductId, price(10_000));
    const cart = addLine(first, secondProductId, price(20_000));
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(11_000))],
        availability([firstProductId], [], { locationId: currentLocationId }),
        { locationId: currentLocationId },
      ),
    );

    expect(report.issues.map((issue) => issue.code)).toEqual([
      CART_REVALIDATION_ISSUE_CODES.locationChanged,
      CART_REVALIDATION_ISSUE_CODES.priceChanged,
      CART_REVALIDATION_ISSUE_CODES.productNotFound,
    ]);
    expect(report.proposedCart.lines).toHaveLength(1);
    expect(report.proposedCart.lines[0]?.productId).toBe(firstProductId);
    expect(report.proposedCart.lines[0]?.unitPrice.minorUnits).toBe(11_000);
    expect(report.removedLineKeys).toEqual([cart.lines[1]?.key]);
  });

  it("does not invent a current price for an invalid selection", () => {
    const previousGroup = group("removed-option-group", [
      { value: "removed-option", adjustment: 500 },
    ]);
    const previousSelection = selection(previousGroup);
    const currentGroup = group("removed-option-group", [
      { value: "replacement-option", adjustment: 0 },
    ]);
    const cart = addLine(emptyCart(), firstProductId, price(), [previousSelection]);
    const report = getSuccess(
      revalidate(
        cart,
        [product(firstProductId, price(), [currentGroup])],
        availability([firstProductId], [optionId(currentGroup)]),
      ),
    );

    expect(report.issues.map((issue) => issue.code)).toEqual([
      CART_REVALIDATION_ISSUE_CODES.optionNotAvailable,
      CART_REVALIDATION_ISSUE_CODES.selectionInvalid,
    ]);
    expect(report.proposedCart.lines).toEqual([]);
  });

  it("rejects inconsistent brand, location and duplicate product inputs", () => {
    const cart = emptyCart();

    expect(
      revalidate(cart, [], availability([], [], { brandId: otherBrandId }), {
        brandId: otherBrandId,
      }),
    ).toMatchObject({ ok: false, error: { code: "CART_BRAND_MISMATCH" } });
    expect(
      revalidate(cart, [], availability([], [], { locationId: currentLocationId })),
    ).toMatchObject({ ok: false, error: { code: "LOCATION_AVAILABILITY_MISMATCH" } });

    const currentProduct = product(firstProductId);
    expect(revalidate(cart, [currentProduct, currentProduct], availability([]))).toMatchObject({
      ok: false,
      error: { code: "INVALID_CART_REVALIDATION", details: { reason: "duplicate_product" } },
    });
  });

  it("rejects an invalid local cart snapshot", () => {
    const validCart = addLine(emptyCart(), firstProductId);
    const firstLine = validCart.lines[0];

    if (firstLine === undefined) {
      throw new Error("The fixture cart requires a line");
    }

    const invalidCart: Cart = {
      ...validCart,
      lines: [{ ...firstLine, quantity: 21 }],
    };

    expect(
      revalidate(invalidCart, [product(firstProductId)], availability([firstProductId])),
    ).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_CART_REVALIDATION",
        details: { reason: "invalid_line_quantity" },
      },
    });
  });

  it("returns an immutable report and proposal", () => {
    const cart = addLine(emptyCart(), firstProductId, price(10_000));
    const report = getSuccess(
      revalidate(cart, [product(firstProductId, price(11_000))], availability([firstProductId])),
    );

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.issues)).toBe(true);
    expect(Object.isFrozen(report.issues[0])).toBe(true);
    expect(Object.isFrozen(report.removedLineKeys)).toBe(true);
    expect(Object.isFrozen(report.proposedCart)).toBe(true);
    expect(Object.isFrozen(report.proposedCart.lines)).toBe(true);
  });
});
