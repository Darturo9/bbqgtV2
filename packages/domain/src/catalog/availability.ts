import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import {
  type BrandId,
  type LocationId,
  type ModifierGroupId,
  type ModifierOptionId,
  type ProductId,
} from "../shared/identifier.js";
import { failure, success, type Result } from "../shared/result.js";
import { type ModifierConditionGraph, getActiveModifierGroups } from "./modifier-conditions.js";
import { type ModifierGroup, type ModifierOption } from "./model.js";
import { type ValidatedModifierSelection } from "./modifier-selection.js";

export type ProductAvailabilityCandidate = Readonly<{
  id: ProductId;
  brandId: BrandId;
  isActive: boolean;
}>;

export type LocationAvailability = Readonly<{
  brandId: BrandId;
  locationId: LocationId;
  availableProductIds: readonly ProductId[];
  availableModifierOptionIds: readonly ModifierOptionId[];
}>;

export type AvailableModifierGroup = Readonly<{
  group: ModifierGroup;
  availableOptions: readonly ModifierOption[];
}>;

export type ProductUnavailabilityReason =
  "product_inactive" | "product_unavailable" | "insufficient_modifier_options";

export type ProductAvailability = Readonly<{
  productId: ProductId;
  locationId: LocationId;
  isAvailable: boolean;
  unavailabilityReasons: readonly ProductUnavailabilityReason[];
  blockingModifierGroupIds: readonly ModifierGroupId[];
  modifierGroups: readonly AvailableModifierGroup[];
}>;

function findDuplicate<T>(values: readonly T[]): T | undefined {
  const encountered = new Set<T>();

  for (const value of values) {
    if (encountered.has(value)) {
      return value;
    }

    encountered.add(value);
  }

  return undefined;
}

export function resolveProductAvailability(
  input: Readonly<{
    brandId: BrandId;
    locationId: LocationId;
    product: ProductAvailabilityCandidate;
    modifierGroups: readonly ModifierGroup[];
    conditionGraph: ModifierConditionGraph;
    selections: readonly ValidatedModifierSelection[];
    locationAvailability: LocationAvailability;
  }>,
): Result<ProductAvailability, DomainError> {
  if (input.product.brandId !== input.brandId) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.productBrandMismatch, {
        path: "product",
        details: { productId: input.product.id },
      }),
    );
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

  const duplicateProductId = findDuplicate(input.locationAvailability.availableProductIds);

  if (duplicateProductId !== undefined) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidLocationAvailability, {
        path: "locationAvailability.availableProductIds",
        details: { reason: "duplicate_product", productId: duplicateProductId },
      }),
    );
  }

  const duplicateOptionId = findDuplicate(input.locationAvailability.availableModifierOptionIds);

  if (duplicateOptionId !== undefined) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidLocationAvailability, {
        path: "locationAvailability.availableModifierOptionIds",
        details: { reason: "duplicate_modifier_option", optionId: duplicateOptionId },
      }),
    );
  }

  const availableOptionIds = new Set(input.locationAvailability.availableModifierOptionIds);
  const selectionsWithAvailableOptions = input.selections.filter((selection) =>
    selection.options.every((option) => option.isActive && availableOptionIds.has(option.id)),
  );
  const activeGroupsResult = getActiveModifierGroups({
    brandId: input.brandId,
    groups: input.modifierGroups,
    conditionGraph: input.conditionGraph,
    selections: selectionsWithAvailableOptions,
  });

  if (!activeGroupsResult.ok) {
    return activeGroupsResult;
  }

  const modifierGroups = activeGroupsResult.value.map((group) =>
    Object.freeze({
      group,
      availableOptions: Object.freeze(
        group.options.filter((option) => option.isActive && availableOptionIds.has(option.id)),
      ),
    }),
  );
  const blockingModifierGroupIds = modifierGroups
    .filter(({ group, availableOptions }) => availableOptions.length < group.minSelections)
    .map(({ group }) => group.id);
  const unavailabilityReasons: ProductUnavailabilityReason[] = [];

  if (!input.product.isActive) {
    unavailabilityReasons.push("product_inactive");
  }

  if (!input.locationAvailability.availableProductIds.includes(input.product.id)) {
    unavailabilityReasons.push("product_unavailable");
  }

  if (blockingModifierGroupIds.length > 0) {
    unavailabilityReasons.push("insufficient_modifier_options");
  }

  return success(
    Object.freeze({
      productId: input.product.id,
      locationId: input.locationId,
      isAvailable: unavailabilityReasons.length === 0,
      unavailabilityReasons: Object.freeze(unavailabilityReasons),
      blockingModifierGroupIds: Object.freeze(blockingModifierGroupIds),
      modifierGroups: Object.freeze(modifierGroups),
    }),
  );
}
