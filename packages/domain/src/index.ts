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
  type Money,
  type PriceAdjustment,
} from "./money/money.js";
export {
  createProductPrice,
  getDiscountPercentage,
  getEffectivePrice,
  type ProductPrice,
} from "./money/product-price.js";
