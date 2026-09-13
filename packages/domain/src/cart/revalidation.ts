import {
  resolveProductAvailability,
  type LocationAvailability,
  type ProductAvailabilityCandidate,
  type ProductUnavailabilityReason,
} from "../catalog/availability.js";
import { type ModifierConditionGraph } from "../catalog/modifier-conditions.js";
import { type ModifierGroup } from "../catalog/model.js";
import {
  calculateConfiguredPrice,
  validateModifierSelection,
  type ValidatedModifierSelection,
} from "../catalog/modifier-selection.js";
import { type Money } from "../money/money.js";
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
import { calculateCartTotals } from "./cart.js";
import { normalizeSpecialInstructions } from "./instructions.js";
import { createCartLineKey, type CartLineKey } from "./line-key.js";
import {
  CART_LIFETIME_MILLISECONDS,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY,
  type Cart,
  type CartLine,
} from "./model.js";

export const CART_REVALIDATION_ISSUE_CODES = {
  locationChanged: "LOCATION_CHANGED",
  productNotFound: "PRODUCT_NOT_FOUND",
  productNotAvailable: "PRODUCT_NOT_AVAILABLE",
  optionNotAvailable: "OPTION_NOT_AVAILABLE",
  selectionInvalid: "SELECTION_INVALID",
  priceChanged: "PRICE_CHANGED",
} as const;

export type CartRevalidationProduct = ProductAvailabilityCandidate &
  Readonly<{
    price: ProductPrice;
    modifierGroups: readonly ModifierGroup[];
    conditionGraph: ModifierConditionGraph;
  }>;

export type CartRevalidationIssue =
  | Readonly<{
      code: typeof CART_REVALIDATION_ISSUE_CODES.locationChanged;
      previousLocationId: LocationId;
      currentLocationId: LocationId;
    }>
  | Readonly<{
      code: typeof CART_REVALIDATION_ISSUE_CODES.productNotFound;
      lineKey: CartLineKey;
      productId: ProductId;
    }>
  | Readonly<{
      code: typeof CART_REVALIDATION_ISSUE_CODES.productNotAvailable;
      lineKey: CartLineKey;
      productId: ProductId;
      reasons: readonly ProductUnavailabilityReason[];
    }>
  | Readonly<{
      code: typeof CART_REVALIDATION_ISSUE_CODES.optionNotAvailable;
      lineKey: CartLineKey;
      productId: ProductId;
      optionIds: readonly ModifierOptionId[];
    }>
  | Readonly<{
      code: typeof CART_REVALIDATION_ISSUE_CODES.selectionInvalid;
      lineKey: CartLineKey;
      productId: ProductId;
      groupIds: readonly ModifierGroupId[];
    }>
  | Readonly<{
      code: typeof CART_REVALIDATION_ISSUE_CODES.priceChanged;
      lineKey: CartLineKey;
      productId: ProductId;
      previousUnitPrice: Money;
      currentUnitPrice: Money;
    }>;

export type CartRevalidationReport = Readonly<{
  issues: readonly CartRevalidationIssue[];
  removedLineKeys: readonly CartLineKey[];
  proposedCart: Cart;
  requiresCustomerAcceptance: boolean;
}>;

function invalidRevalidation(reason: string, path: string): Result<never, DomainError> {
  return failure(
    createDomainError(DOMAIN_ERROR_CODES.invalidCartRevalidation, {
      path,
      details: { reason },
    }),
  );
}

function pushUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function validateCartSnapshot(cart: Cart): Result<undefined, DomainError> {
  if (
    !Number.isSafeInteger(cart.createdAt) ||
    cart.createdAt < 0 ||
    cart.expiresAt !== cart.createdAt + CART_LIFETIME_MILLISECONDS
  ) {
    return invalidRevalidation("invalid_expiration", "cart");
  }

  const lineKeys = new Set<CartLineKey>();
  let totalQuantity = 0;

  for (const line of cart.lines) {
    if (line.brandId !== cart.brandId) {
      return invalidRevalidation("line_brand_mismatch", "cart.lines");
    }

    if (line.locationId !== cart.locationId) {
      return invalidRevalidation("line_location_mismatch", "cart.lines");
    }

    if (
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_CART_LINE_QUANTITY
    ) {
      return invalidRevalidation("invalid_line_quantity", "cart.lines");
    }

    totalQuantity += line.quantity;

    if (lineKeys.has(line.key)) {
      return invalidRevalidation("duplicate_line_key", "cart.lines");
    }

    lineKeys.add(line.key);

    const instructionsResult = normalizeSpecialInstructions(line.instructions);

    if (!instructionsResult.ok || instructionsResult.value !== line.instructions) {
      return invalidRevalidation("invalid_instructions", "cart.lines");
    }

    const expectedKey = createCartLineKey({
      productId: line.productId,
      modifierSelections: line.modifierSelections,
      ...(line.instructions === undefined ? {} : { instructions: line.instructions }),
    });

    if (expectedKey !== line.key) {
      return invalidRevalidation("invalid_line_key", "cart.lines");
    }
  }

  if (totalQuantity > MAX_CART_TOTAL_QUANTITY) {
    return invalidRevalidation("invalid_total_quantity", "cart.lines");
  }

  const totalsResult = calculateCartTotals(cart);
  return totalsResult.ok ? success(undefined) : totalsResult;
}

function validateRevalidationInput(
  input: Readonly<{
    cart: Cart;
    brandId: BrandId;
    locationId: LocationId;
    products: readonly CartRevalidationProduct[];
    locationAvailability: LocationAvailability;
  }>,
): Result<Map<ProductId, CartRevalidationProduct>, DomainError> {
  if (input.cart.brandId !== input.brandId) {
    return failure(createDomainError(DOMAIN_ERROR_CODES.cartBrandMismatch, { path: "brandId" }));
  }

  if (
    input.locationAvailability.brandId !== input.brandId ||
    input.locationAvailability.locationId !== input.locationId
  ) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.locationAvailabilityMismatch, {
        path: "locationAvailability",
        details: {
          expectedLocationId: input.locationId,
          receivedLocationId: input.locationAvailability.locationId,
        },
      }),
    );
  }

  if (
    new Set(input.locationAvailability.availableProductIds).size !==
      input.locationAvailability.availableProductIds.length ||
    new Set(input.locationAvailability.availableModifierOptionIds).size !==
      input.locationAvailability.availableModifierOptionIds.length
  ) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidLocationAvailability, {
        path: "locationAvailability",
        details: { reason: "duplicate_availability_entry" },
      }),
    );
  }

  const productById = new Map<ProductId, CartRevalidationProduct>();

  for (const product of input.products) {
    if (product.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.productBrandMismatch, {
          path: "products",
          details: { productId: product.id },
        }),
      );
    }

    if (product.conditionGraph.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
          path: "products.conditionGraph",
          details: { productId: product.id },
        }),
      );
    }

    if (productById.has(product.id)) {
      return invalidRevalidation("duplicate_product", "products");
    }

    productById.set(product.id, product);
  }

  return success(productById);
}

function inspectSelections(
  line: CartLine,
  product: CartRevalidationProduct,
  availableOptionIds: ReadonlySet<ModifierOptionId>,
): Readonly<{
  currentSelections: readonly ValidatedModifierSelection[];
  invalidGroupIds: readonly ModifierGroupId[];
  unavailableOptionIds: readonly ModifierOptionId[];
}> {
  const currentGroupById = new Map(product.modifierGroups.map((group) => [group.id, group]));
  const currentSelections: ValidatedModifierSelection[] = [];
  const invalidGroupIds: ModifierGroupId[] = [];
  const unavailableOptionIds: ModifierOptionId[] = [];

  for (const previousSelection of line.modifierSelections) {
    const currentGroup = currentGroupById.get(previousSelection.groupId);

    if (currentGroup === undefined) {
      pushUnique(invalidGroupIds, previousSelection.groupId);

      for (const option of previousSelection.options) {
        pushUnique(unavailableOptionIds, option.id);
      }

      continue;
    }

    const currentOptionById = new Map(currentGroup.options.map((option) => [option.id, option]));

    for (const previousOption of previousSelection.options) {
      const currentOption = currentOptionById.get(previousOption.id);

      if (
        currentOption === undefined ||
        !currentOption.isActive ||
        !availableOptionIds.has(previousOption.id)
      ) {
        pushUnique(unavailableOptionIds, previousOption.id);
      }
    }

    const selectionResult = validateModifierSelection({
      brandId: product.brandId,
      group: currentGroup,
      optionIds: previousSelection.options.map((option) => option.id),
    });

    if (!selectionResult.ok) {
      pushUnique(invalidGroupIds, previousSelection.groupId);
      continue;
    }

    currentSelections.push(selectionResult.value);
  }

  return {
    currentSelections,
    invalidGroupIds,
    unavailableOptionIds,
  };
}

function proposedLine(
  previousLine: CartLine,
  locationId: LocationId,
  selections: readonly ValidatedModifierSelection[],
  unitPrice: Money,
): CartLine {
  return Object.freeze({
    ...previousLine,
    locationId,
    modifierSelections: Object.freeze([...selections]),
    unitPrice,
  });
}

export function revalidateCart(
  input: Readonly<{
    cart: Cart;
    brandId: BrandId;
    locationId: LocationId;
    products: readonly CartRevalidationProduct[];
    locationAvailability: LocationAvailability;
  }>,
): Result<CartRevalidationReport, DomainError> {
  const cartResult = validateCartSnapshot(input.cart);

  if (!cartResult.ok) {
    return cartResult;
  }

  const inputResult = validateRevalidationInput(input);

  if (!inputResult.ok) {
    return inputResult;
  }

  const issues: CartRevalidationIssue[] = [];
  const removedLineKeys: CartLineKey[] = [];
  const nextLines: CartLine[] = [];
  const availableOptionIds = new Set(input.locationAvailability.availableModifierOptionIds);

  if (input.cart.locationId !== input.locationId) {
    issues.push(
      Object.freeze({
        code: CART_REVALIDATION_ISSUE_CODES.locationChanged,
        previousLocationId: input.cart.locationId,
        currentLocationId: input.locationId,
      }),
    );
  }

  for (const line of input.cart.lines) {
    const product = inputResult.value.get(line.productId);

    if (product === undefined) {
      issues.push(
        Object.freeze({
          code: CART_REVALIDATION_ISSUE_CODES.productNotFound,
          lineKey: line.key,
          productId: line.productId,
        }),
      );
      removedLineKeys.push(line.key);
      continue;
    }

    const selectionInspection = inspectSelections(line, product, availableOptionIds);
    const availabilityResult = resolveProductAvailability({
      brandId: input.brandId,
      locationId: input.locationId,
      product,
      modifierGroups: product.modifierGroups,
      conditionGraph: product.conditionGraph,
      selections: selectionInspection.currentSelections,
      locationAvailability: input.locationAvailability,
    });

    if (!availabilityResult.ok) {
      return availabilityResult;
    }

    const activeGroupIds = new Set(
      availabilityResult.value.modifierGroups.map(({ group }) => group.id),
    );
    const selectedGroupIds = new Set(
      selectionInspection.currentSelections.map((selection) => selection.groupId),
    );
    const invalidGroupIds = [...selectionInspection.invalidGroupIds];

    for (const selection of selectionInspection.currentSelections) {
      if (!activeGroupIds.has(selection.groupId)) {
        pushUnique(invalidGroupIds, selection.groupId);
      }
    }

    for (const { group } of availabilityResult.value.modifierGroups) {
      if (group.minSelections > 0 && !selectedGroupIds.has(group.id)) {
        pushUnique(invalidGroupIds, group.id);
      }
    }

    if (!availabilityResult.value.isAvailable) {
      issues.push(
        Object.freeze({
          code: CART_REVALIDATION_ISSUE_CODES.productNotAvailable,
          lineKey: line.key,
          productId: line.productId,
          reasons: availabilityResult.value.unavailabilityReasons,
        }),
      );
    }

    if (selectionInspection.unavailableOptionIds.length > 0) {
      issues.push(
        Object.freeze({
          code: CART_REVALIDATION_ISSUE_CODES.optionNotAvailable,
          lineKey: line.key,
          productId: line.productId,
          optionIds: Object.freeze([...selectionInspection.unavailableOptionIds]),
        }),
      );
    }

    if (invalidGroupIds.length > 0) {
      issues.push(
        Object.freeze({
          code: CART_REVALIDATION_ISSUE_CODES.selectionInvalid,
          lineKey: line.key,
          productId: line.productId,
          groupIds: Object.freeze(invalidGroupIds),
        }),
      );
    }

    let currentUnitPrice = line.unitPrice;

    if (invalidGroupIds.length === 0) {
      const currentUnitPriceResult = calculateConfiguredPrice(
        getEffectivePrice(product.price),
        selectionInspection.currentSelections,
      );

      if (!currentUnitPriceResult.ok) {
        return currentUnitPriceResult;
      }

      currentUnitPrice = currentUnitPriceResult.value;

      if (currentUnitPrice.minorUnits !== line.unitPrice.minorUnits) {
        issues.push(
          Object.freeze({
            code: CART_REVALIDATION_ISSUE_CODES.priceChanged,
            lineKey: line.key,
            productId: line.productId,
            previousUnitPrice: line.unitPrice,
            currentUnitPrice,
          }),
        );
      }
    }

    const mustRemoveLine =
      !availabilityResult.value.isAvailable ||
      selectionInspection.unavailableOptionIds.length > 0 ||
      invalidGroupIds.length > 0;

    if (mustRemoveLine) {
      removedLineKeys.push(line.key);
    } else {
      nextLines.push(
        proposedLine(
          line,
          input.locationId,
          selectionInspection.currentSelections,
          currentUnitPrice,
        ),
      );
    }
  }

  const requiresCustomerAcceptance = issues.length > 0;
  const proposedCart = requiresCustomerAcceptance
    ? Object.freeze({
        ...input.cart,
        locationId: input.locationId,
        lines: Object.freeze(nextLines),
      })
    : input.cart;

  return success(
    Object.freeze({
      issues: Object.freeze(issues),
      removedLineKeys: Object.freeze(removedLineKeys),
      proposedCart,
      requiresCustomerAcceptance,
    }),
  );
}
