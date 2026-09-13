export const DOMAIN_ERROR_CODES = {
  invalidIdentifier: "INVALID_IDENTIFIER",
  invalidMoney: "INVALID_MONEY",
  invalidMoneyMultiplier: "INVALID_MONEY_MULTIPLIER",
  invalidPriceAdjustment: "INVALID_PRICE_ADJUSTMENT",
  invalidProductPrice: "INVALID_PRODUCT_PRICE",
  invalidModifierGroup: "INVALID_MODIFIER_GROUP",
  invalidModifierOption: "INVALID_MODIFIER_OPTION",
  modifierBrandMismatch: "MODIFIER_BRAND_MISMATCH",
  modifierGroupMismatch: "MODIFIER_GROUP_MISMATCH",
  modifierGroupNotActive: "MODIFIER_GROUP_NOT_ACTIVE",
  modifierOptionNotActive: "MODIFIER_OPTION_NOT_ACTIVE",
  modifierOptionNotFound: "MODIFIER_OPTION_NOT_FOUND",
  modifierGroupNotFound: "MODIFIER_GROUP_NOT_FOUND",
  duplicateModifierOption: "DUPLICATE_MODIFIER_OPTION",
  duplicateModifierSelection: "DUPLICATE_MODIFIER_SELECTION",
  invalidModifierDependency: "INVALID_MODIFIER_DEPENDENCY",
  invalidModifierAssignment: "INVALID_MODIFIER_ASSIGNMENT",
  duplicateEffectiveModifierGroup: "DUPLICATE_EFFECTIVE_MODIFIER_GROUP",
  productBrandMismatch: "PRODUCT_BRAND_MISMATCH",
  locationAvailabilityMismatch: "LOCATION_AVAILABILITY_MISMATCH",
  invalidLocationAvailability: "INVALID_LOCATION_AVAILABILITY",
  invalidCart: "INVALID_CART",
  invalidCartLine: "INVALID_CART_LINE",
  cartBrandMismatch: "CART_BRAND_MISMATCH",
  cartLocationMismatch: "CART_LOCATION_MISMATCH",
  cartLineNotFound: "CART_LINE_NOT_FOUND",
  cartLineLimitExceeded: "CART_LINE_LIMIT_EXCEEDED",
  cartTotalLimitExceeded: "CART_TOTAL_LIMIT_EXCEEDED",
  cartLinePriceMismatch: "CART_LINE_PRICE_MISMATCH",
  specialInstructionsTooLong: "SPECIAL_INSTRUCTIONS_TOO_LONG",
  invalidCartRevalidation: "INVALID_CART_REVALIDATION",
  requiredSelectionMissing: "REQUIRED_SELECTION_MISSING",
  selectionLimitExceeded: "SELECTION_LIMIT_EXCEEDED",
  moneyOverflow: "MONEY_OVERFLOW",
  negativeMoneyResult: "NEGATIVE_MONEY_RESULT",
} as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[keyof typeof DOMAIN_ERROR_CODES];

export type DomainErrorDetail = string | number | boolean;

export type DomainError = Readonly<{
  code: DomainErrorCode;
  path?: string;
  details?: Readonly<Record<string, DomainErrorDetail>>;
}>;

type DomainErrorContext = Readonly<{
  path?: string;
  details?: Readonly<Record<string, DomainErrorDetail>>;
}>;

export function createDomainError(
  code: DomainErrorCode,
  context: DomainErrorContext = {},
): DomainError {
  return {
    code,
    ...(context.path === undefined ? {} : { path: context.path }),
    ...(context.details === undefined ? {} : { details: context.details }),
  };
}
