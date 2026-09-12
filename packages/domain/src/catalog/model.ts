import { type PriceAdjustment } from "../money/money.js";
import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import { type BrandId, type ModifierGroupId, type ModifierOptionId } from "../shared/identifier.js";
import { failure, success, type Result } from "../shared/result.js";

export type ModifierSelectionType = "single" | "multiple";

export type ModifierOption = Readonly<{
  id: ModifierOptionId;
  brandId: BrandId;
  groupId: ModifierGroupId;
  name: string;
  description?: string;
  priceAdjustment: PriceAdjustment;
  displayOrder: number;
  isActive: boolean;
}>;

export type ModifierGroup = Readonly<{
  id: ModifierGroupId;
  brandId: BrandId;
  name: string;
  description?: string;
  selectionType: ModifierSelectionType;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: readonly ModifierOption[];
}>;

export type CreateModifierOptionInput = Readonly<{
  id: ModifierOptionId;
  brandId: BrandId;
  groupId: ModifierGroupId;
  name: string;
  description?: string;
  priceAdjustment: PriceAdjustment;
  displayOrder: number;
  isActive: boolean;
}>;

export type CreateModifierGroupInput = Readonly<{
  id: ModifierGroupId;
  brandId: BrandId;
  name: string;
  description?: string;
  selectionType: ModifierSelectionType;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: readonly ModifierOption[];
}>;

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function invalidOption(path: string, reason: string): Result<ModifierOption, DomainError> {
  return failure(
    createDomainError(DOMAIN_ERROR_CODES.invalidModifierOption, {
      path,
      details: { reason },
    }),
  );
}

function invalidGroup(path: string, reason: string): Result<ModifierGroup, DomainError> {
  return failure(
    createDomainError(DOMAIN_ERROR_CODES.invalidModifierGroup, {
      path,
      details: { reason },
    }),
  );
}

export function createModifierOption(
  input: CreateModifierOptionInput,
): Result<ModifierOption, DomainError> {
  const name = input.name.trim();

  if (name.length === 0) {
    return invalidOption("name", "empty");
  }

  if (!isNonNegativeSafeInteger(input.displayOrder)) {
    return invalidOption("displayOrder", "invalid_non_negative_integer");
  }

  const description = normalizeOptionalText(input.description);

  return success(
    Object.freeze({
      id: input.id,
      brandId: input.brandId,
      groupId: input.groupId,
      name,
      ...(description === undefined ? {} : { description }),
      priceAdjustment: input.priceAdjustment,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
    }),
  );
}

export function createModifierGroup(
  input: CreateModifierGroupInput,
): Result<ModifierGroup, DomainError> {
  const name = input.name.trim();

  if (name.length === 0) {
    return invalidGroup("name", "empty");
  }

  if (!isNonNegativeSafeInteger(input.displayOrder)) {
    return invalidGroup("displayOrder", "invalid_non_negative_integer");
  }

  if (!isNonNegativeSafeInteger(input.minSelections)) {
    return invalidGroup("minSelections", "invalid_non_negative_integer");
  }

  if (!Number.isSafeInteger(input.maxSelections) || input.maxSelections < 1) {
    return invalidGroup("maxSelections", "invalid_positive_integer");
  }

  if (input.minSelections > input.maxSelections) {
    return invalidGroup("minSelections", "greater_than_maximum");
  }

  if (input.selectionType === "single" && (input.minSelections > 1 || input.maxSelections !== 1)) {
    return invalidGroup("selectionType", "invalid_single_selection_range");
  }

  const optionIds = new Set<ModifierOptionId>();

  for (const option of input.options) {
    if (option.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
          path: "options",
          details: { optionId: option.id },
        }),
      );
    }

    if (option.groupId !== input.id) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierGroupMismatch, {
          path: "options",
          details: { optionId: option.id },
        }),
      );
    }

    if (optionIds.has(option.id)) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.duplicateModifierOption, {
          path: "options",
          details: { optionId: option.id },
        }),
      );
    }

    optionIds.add(option.id);
  }

  const activeOptionCount = input.options.filter((option) => option.isActive).length;

  if (input.maxSelections > activeOptionCount) {
    return invalidGroup("maxSelections", "greater_than_active_options");
  }

  const description = normalizeOptionalText(input.description);
  const options = Object.freeze([...input.options]);

  return success(
    Object.freeze({
      id: input.id,
      brandId: input.brandId,
      name,
      ...(description === undefined ? {} : { description }),
      selectionType: input.selectionType,
      minSelections: input.minSelections,
      maxSelections: input.maxSelections,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      options,
    }),
  );
}

export function isModifierGroupRequired(group: ModifierGroup): boolean {
  return group.minSelections > 0;
}
