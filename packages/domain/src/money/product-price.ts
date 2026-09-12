import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import { failure, success, type Result } from "../shared/result.js";
import { type Money } from "./money.js";

export type ProductPrice = Readonly<{
  regular: Money;
  sale?: Money;
}>;

export function createProductPrice(
  input: Readonly<{ regular: Money; sale?: Money }>,
): Result<ProductPrice, DomainError> {
  if (input.regular.minorUnits <= 0) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidProductPrice, {
        path: "regular",
        details: { reason: "not_positive" },
      }),
    );
  }

  if (input.sale !== undefined && input.sale.minorUnits <= 0) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidProductPrice, {
        path: "sale",
        details: { reason: "not_positive" },
      }),
    );
  }

  if (input.sale !== undefined && input.sale.minorUnits >= input.regular.minorUnits) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidProductPrice, {
        path: "sale",
        details: { reason: "not_lower_than_regular" },
      }),
    );
  }

  return success(
    Object.freeze({
      regular: input.regular,
      ...(input.sale === undefined ? {} : { sale: input.sale }),
    }),
  );
}

export function getEffectivePrice(price: ProductPrice): Money {
  return price.sale ?? price.regular;
}

export function getDiscountPercentage(price: ProductPrice): number | null {
  if (price.sale === undefined) {
    return null;
  }

  const discountMinorUnits = price.regular.minorUnits - price.sale.minorUnits;
  return Math.round((discountMinorUnits / price.regular.minorUnits) * 100);
}
