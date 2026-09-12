export {
  DOMAIN_ERROR_CODES,
  createDomainError,
  type DomainError,
  type DomainErrorCode,
  type DomainErrorDetail,
} from "./shared/domain-error.js";
export {
  createIdentifier,
  type BrandId,
  type CategoryId,
  type IdentifierKind,
  type LocationId,
  type ModifierGroupId,
  type ModifierOptionId,
  type ProductId,
} from "./shared/identifier.js";
export { failure, success, type Failure, type Result, type Success } from "./shared/result.js";
export {
  MONEY_CURRENCY,
  addMoney,
  applyPriceAdjustment,
  createMoney,
  createPriceAdjustment,
  multiplyMoney,
  sumPriceAdjustments,
  type Money,
  type PriceAdjustment,
} from "./money/money.js";
export {
  createProductPrice,
  getDiscountPercentage,
  getEffectivePrice,
  type ProductPrice,
} from "./money/product-price.js";
export {
  createModifierGroup,
  createModifierOption,
  isModifierGroupRequired,
  type CreateModifierGroupInput,
  type CreateModifierOptionInput,
  type ModifierGroup,
  type ModifierOption,
  type ModifierSelectionType,
} from "./catalog/model.js";
export {
  calculateConfiguredPrice,
  validateModifierSelection,
  type ValidatedModifierSelection,
} from "./catalog/modifier-selection.js";
export {
  getActiveModifierGroups,
  validateModifierConditions,
  type ModifierCondition,
  type ModifierConditionGraph,
} from "./catalog/modifier-conditions.js";
export {
  resolveModifierGroupsForProduct,
  type CategoryModifierAssignment,
  type ProductModifierAssignment,
  type ResolvedModifierGroup,
} from "./catalog/modifier-assignments.js";
