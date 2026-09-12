import {
  applyPriceAdjustment,
  sumPriceAdjustments,
  type Money,
  type PriceAdjustment,
} from "../money/money.js";
import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import { type BrandId, type ModifierGroupId, type ModifierOptionId } from "../shared/identifier.js";
import { failure, success, type Result } from "../shared/result.js";
import { type ModifierGroup, type ModifierOption } from "./model.js";

export type ValidatedModifierSelection = Readonly<{
  groupId: ModifierGroupId;
  options: readonly ModifierOption[];
  priceAdjustment: PriceAdjustment;
}>;

export function validateModifierSelection(
  input: Readonly<{
    brandId: BrandId;
    group: ModifierGroup;
    optionIds: readonly ModifierOptionId[];
  }>,
): Result<ValidatedModifierSelection, DomainError> {
  const { group, optionIds } = input;

  if (group.brandId !== input.brandId) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
        path: "group",
        details: { groupId: group.id },
      }),
    );
  }

  if (!group.isActive) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.modifierGroupNotActive, {
        path: "group",
        details: { groupId: group.id },
      }),
    );
  }

  if (new Set(optionIds).size !== optionIds.length) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.duplicateModifierSelection, {
        path: "optionIds",
        details: { groupId: group.id },
      }),
    );
  }

  if (optionIds.length < group.minSelections) {
    const code =
      optionIds.length === 0
        ? DOMAIN_ERROR_CODES.requiredSelectionMissing
        : DOMAIN_ERROR_CODES.selectionLimitExceeded;

    return failure(
      createDomainError(code, {
        path: "optionIds",
        details: {
          actual: optionIds.length,
          expectedMinimum: group.minSelections,
          groupId: group.id,
        },
      }),
    );
  }

  if (optionIds.length > group.maxSelections) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.selectionLimitExceeded, {
        path: "optionIds",
        details: {
          actual: optionIds.length,
          expectedMaximum: group.maxSelections,
          groupId: group.id,
        },
      }),
    );
  }

  const optionById = new Map(group.options.map((option) => [option.id, option]));
  const selectedOptions: ModifierOption[] = [];

  for (const optionId of optionIds) {
    const option = optionById.get(optionId);

    if (option === undefined) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierOptionNotFound, {
          path: "optionIds",
          details: { groupId: group.id, optionId },
        }),
      );
    }

    if (!option.isActive) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierOptionNotActive, {
          path: "optionIds",
          details: { groupId: group.id, optionId },
        }),
      );
    }

    selectedOptions.push(option);
  }

  selectedOptions.sort((left, right) => {
    const displayOrderDifference = left.displayOrder - right.displayOrder;

    if (displayOrderDifference !== 0) {
      return displayOrderDifference;
    }

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });

  const adjustmentResult = sumPriceAdjustments(
    selectedOptions.map((option) => option.priceAdjustment),
  );

  if (!adjustmentResult.ok) {
    return adjustmentResult;
  }

  return success(
    Object.freeze({
      groupId: group.id,
      options: Object.freeze(selectedOptions),
      priceAdjustment: adjustmentResult.value,
    }),
  );
}

export function calculateConfiguredPrice(
  basePrice: Money,
  selections: readonly ValidatedModifierSelection[],
): Result<Money, DomainError> {
  const adjustmentResult = sumPriceAdjustments(
    selections.map((selection) => selection.priceAdjustment),
  );

  if (!adjustmentResult.ok) {
    return adjustmentResult;
  }

  return applyPriceAdjustment(basePrice, adjustmentResult.value);
}
