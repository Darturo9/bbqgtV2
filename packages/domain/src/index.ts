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
export {
  resolveProductAvailability,
  type AvailableModifierGroup,
  type LocationAvailability,
  type ProductAvailability,
  type ProductAvailabilityCandidate,
  type ProductUnavailabilityReason,
} from "./catalog/availability.js";
export {
  MAX_SPECIAL_INSTRUCTIONS_LENGTH,
  normalizeSpecialInstructions,
  type SpecialInstructions,
} from "./cart/instructions.js";
export { createCartLineKey, type CartLineKey } from "./cart/line-key.js";
export {
  CART_LIFETIME_MILLISECONDS,
  MAX_CART_LINE_QUANTITY,
  MAX_CART_TOTAL_QUANTITY,
  type Cart,
  type CartLine,
  type CartLineSubtotal,
  type CartTotals,
} from "./cart/model.js";
export {
  addCartLine,
  calculateCartTotals,
  clearCart,
  createCart,
  isCartExpired,
  removeCartLine,
  updateCartLineQuantity,
  type AddCartLineInput,
} from "./cart/cart.js";
export {
  CART_REVALIDATION_ISSUE_CODES,
  revalidateCart,
  type CartRevalidationIssue,
  type CartRevalidationProduct,
  type CartRevalidationReport,
} from "./cart/revalidation.js";
