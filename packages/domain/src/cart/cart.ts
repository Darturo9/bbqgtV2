import {
  calculateConfiguredPrice,
  type ValidatedModifierSelection,
} from "../catalog/modifier-selection.js";
import { addMoney, createMoney, multiplyMoney, type Money } from "../money/money.js";
import { getEffectivePrice, type ProductPrice } from "../money/product-price.js";
import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import {
  type BrandId,
  type LocationId,
  type ModifierGroupId,
  type ModifierOptionId,
  type ProductId,
} from "../shared/identifier.js";
import { failure, success, type Result } from "../shared/result.js";
import { normalizeSpecialInstructions } from "./instructions.js";
import { createCartLineKey, type CartLineKey } from "./line-key.js";
import {
  CART_LIFETIME_MILLISECONDS,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY,
  type Cart,
  type CartLine,
  type CartLineSubtotal,
  type CartTotals,
} from "./model.js";

export type AddCartLineInput = Readonly<{
  brandId: BrandId;
  locationId: LocationId;
  productId: ProductId;
  productPrice: ProductPrice;
  modifierSelections: readonly ValidatedModifierSelection[];
  quantity: number;
  instructions?: string;
}>;

function freezeCart(cart: Cart, lines: readonly CartLine[]): Cart {
  return Object.freeze({ ...cart, lines: Object.freeze([...lines]) });
}

function invalidCartLine(reason: string): Result<never, DomainError> {
  return failure(
    createDomainError(DOMAIN_ERROR_CODES.invalidCartLine, {
      path: "line",
      details: { reason },
    }),
  );
}

function validateLineQuantity(
  quantity: number,
  allowZero: boolean,
): Result<undefined, DomainError> {
  if (!Number.isSafeInteger(quantity) || quantity < (allowZero ? 0 : 1)) {
    return invalidCartLine("invalid_quantity");
  }

  if (quantity > MAX_CART_LINE_QUANTITY) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.cartLineLimitExceeded, {
        path: "quantity",
        details: { actual: quantity, maximum: MAX_CART_LINE_QUANTITY },
      }),
    );
  }

  return success(undefined);
}

function validateSelectionStructure(
  brandId: BrandId,
  selections: readonly ValidatedModifierSelection[],
): Result<undefined, DomainError> {
  const groupIds = new Set<ModifierGroupId>();
  const optionIds = new Set<ModifierOptionId>();

  for (const selection of selections) {
    if (groupIds.has(selection.groupId)) {
      return invalidCartLine("duplicate_modifier_group");
    }

    groupIds.add(selection.groupId);

    for (const option of selection.options) {
      if (option.brandId !== brandId) {
        return invalidCartLine("modifier_brand_mismatch");
      }

      if (option.groupId !== selection.groupId) {
        return invalidCartLine("modifier_group_mismatch");
      }

      if (optionIds.has(option.id)) {
        return invalidCartLine("duplicate_modifier_option");
      }

      optionIds.add(option.id);
    }
  }

  return success(undefined);
}

function getTotalQuantity(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

function validateCartTotalQuantity(lines: readonly CartLine[]): Result<undefined, DomainError> {
  const totalQuantity = getTotalQuantity(lines);

  if (totalQuantity > MAX_CART_TOTAL_QUANTITY) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.cartTotalLimitExceeded, {
        path: "lines",
        details: { actual: totalQuantity, maximum: MAX_CART_TOTAL_QUANTITY },
      }),
    );
  }

  return success(undefined);
}

function validateCartMoney(lines: readonly CartLine[]): Result<undefined, DomainError> {
  const totalsResult = calculateCartTotalsFromLines(lines);
  return totalsResult.ok ? success(undefined) : totalsResult;
}

function calculateCartTotalsFromLines(lines: readonly CartLine[]): Result<CartTotals, DomainError> {
  const zeroResult = createMoney(0);

  if (!zeroResult.ok) {
    return zeroResult;
  }

  let subtotal: Money = zeroResult.value;
  const lineSubtotals: CartLineSubtotal[] = [];

  for (const line of lines) {
    const lineSubtotalResult = multiplyMoney(line.unitPrice, line.quantity);

    if (!lineSubtotalResult.ok) {
      return lineSubtotalResult;
    }

    const nextSubtotalResult = addMoney(subtotal, lineSubtotalResult.value);

    if (!nextSubtotalResult.ok) {
      return nextSubtotalResult;
    }

    subtotal = nextSubtotalResult.value;
    lineSubtotals.push(Object.freeze({ lineKey: line.key, subtotal: lineSubtotalResult.value }));
  }

  return success(
    Object.freeze({
      totalQuantity: getTotalQuantity(lines),
      lineSubtotals: Object.freeze(lineSubtotals),
      subtotal,
    }),
  );
}

export function createCart(
  input: Readonly<{ brandId: BrandId; locationId: LocationId; createdAt: number }>,
): Result<Cart, DomainError> {
  if (!Number.isSafeInteger(input.createdAt) || input.createdAt < 0) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidCart, {
        path: "createdAt",
        details: { reason: "invalid_epoch_milliseconds" },
      }),
    );
  }

  const expiresAt = input.createdAt + CART_LIFETIME_MILLISECONDS;

  if (!Number.isSafeInteger(expiresAt)) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidCart, {
        path: "createdAt",
        details: { reason: "expiration_overflow" },
      }),
    );
  }

  return success(
    Object.freeze({
      brandId: input.brandId,
      locationId: input.locationId,
      createdAt: input.createdAt,
      expiresAt,
      lines: Object.freeze([]),
    }),
  );
}

export function addCartLine(cart: Cart, input: AddCartLineInput): Result<Cart, DomainError> {
  if (input.brandId !== cart.brandId) {
    return failure(createDomainError(DOMAIN_ERROR_CODES.cartBrandMismatch, { path: "brandId" }));
  }

  if (input.locationId !== cart.locationId) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.cartLocationMismatch, { path: "locationId" }),
    );
  }

  const quantityResult = validateLineQuantity(input.quantity, false);

  if (!quantityResult.ok) {
    return quantityResult;
  }

  const selectionResult = validateSelectionStructure(input.brandId, input.modifierSelections);

  if (!selectionResult.ok) {
    return selectionResult;
  }

  const instructionsResult = normalizeSpecialInstructions(input.instructions);

  if (!instructionsResult.ok) {
    return instructionsResult;
  }

  const unitPriceResult = calculateConfiguredPrice(
    getEffectivePrice(input.productPrice),
    input.modifierSelections,
  );

  if (!unitPriceResult.ok) {
    return unitPriceResult;
  }

  const key = createCartLineKey({
    productId: input.productId,
    modifierSelections: input.modifierSelections,
    ...(instructionsResult.value === undefined ? {} : { instructions: instructionsResult.value }),
  });
  const existingLineIndex = cart.lines.findIndex((line) => line.key === key);
  const nextLines = [...cart.lines];

  if (existingLineIndex >= 0) {
    const existingLine = cart.lines[existingLineIndex];

    if (existingLine === undefined) {
      return invalidCartLine("line_index_out_of_bounds");
    }

    if (existingLine.unitPrice.minorUnits !== unitPriceResult.value.minorUnits) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.cartLinePriceMismatch, {
          path: "unitPrice",
          details: {
            current: existingLine.unitPrice.minorUnits,
            received: unitPriceResult.value.minorUnits,
          },
        }),
      );
    }

    const combinedQuantity = existingLine.quantity + input.quantity;
    const combinedQuantityResult = validateLineQuantity(combinedQuantity, false);

    if (!combinedQuantityResult.ok) {
      return combinedQuantityResult;
    }

    nextLines[existingLineIndex] = Object.freeze({
      ...existingLine,
      quantity: combinedQuantity,
    });
  } else {
    nextLines.push(
      Object.freeze({
        key,
        brandId: input.brandId,
        locationId: input.locationId,
        productId: input.productId,
        modifierSelections: Object.freeze([...input.modifierSelections]),
        ...(instructionsResult.value === undefined
          ? {}
          : { instructions: instructionsResult.value }),
        unitPrice: unitPriceResult.value,
        quantity: input.quantity,
      }),
    );
  }

  const totalQuantityResult = validateCartTotalQuantity(nextLines);

  if (!totalQuantityResult.ok) {
    return totalQuantityResult;
  }

  const moneyResult = validateCartMoney(nextLines);

  if (!moneyResult.ok) {
    return moneyResult;
  }

  return success(freezeCart(cart, nextLines));
}

export function updateCartLineQuantity(
  cart: Cart,
  input: Readonly<{ lineKey: CartLineKey; quantity: number }>,
): Result<Cart, DomainError> {
  const lineIndex = cart.lines.findIndex((line) => line.key === input.lineKey);

  if (lineIndex < 0) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.cartLineNotFound, {
        path: "lineKey",
        details: { lineKey: input.lineKey },
      }),
    );
  }

  const quantityResult = validateLineQuantity(input.quantity, true);

  if (!quantityResult.ok) {
    return quantityResult;
  }

  if (input.quantity === 0) {
    return success(removeCartLine(cart, input.lineKey));
  }

  const existingLine = cart.lines[lineIndex];

  if (existingLine === undefined) {
    return invalidCartLine("line_index_out_of_bounds");
  }

  const nextLines = [...cart.lines];
  nextLines[lineIndex] = Object.freeze({ ...existingLine, quantity: input.quantity });

  const totalQuantityResult = validateCartTotalQuantity(nextLines);

  if (!totalQuantityResult.ok) {
    return totalQuantityResult;
  }

  const moneyResult = validateCartMoney(nextLines);

  if (!moneyResult.ok) {
    return moneyResult;
  }

  return success(freezeCart(cart, nextLines));
}

export function removeCartLine(cart: Cart, lineKey: CartLineKey): Cart {
  if (!cart.lines.some((line) => line.key === lineKey)) {
    return cart;
  }

  return freezeCart(
    cart,
    cart.lines.filter((line) => line.key !== lineKey),
  );
}

export function clearCart(cart: Cart): Cart {
  return cart.lines.length === 0 ? cart : freezeCart(cart, []);
}

export function isCartExpired(cart: Cart, now: number): boolean {
  return now >= cart.expiresAt;
}

export function calculateCartTotals(cart: Cart): Result<CartTotals, DomainError> {
  return calculateCartTotalsFromLines(cart.lines);
}
