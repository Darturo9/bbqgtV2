import {
  DOMAIN_ERROR_CODES,
  createDomainError,
  type DomainError,
  type DomainErrorCode,
} from "../shared/domain-error.js";
import { failure, success, type Result } from "../shared/result.js";

export const MONEY_CURRENCY = "GTQ" as const;

declare const moneyBrand: unique symbol;
declare const priceAdjustmentBrand: unique symbol;

export type Money = Readonly<{
  currency: typeof MONEY_CURRENCY;
  minorUnits: number;
  readonly [moneyBrand]: true;
}>;

export type PriceAdjustment = Readonly<{
  currency: typeof MONEY_CURRENCY;
  minorUnits: number;
  readonly [priceAdjustmentBrand]: true;
}>;

type IntegerValidationReason = "negative" | "not_finite" | "not_integer" | "unsafe_integer";

function getIntegerValidationReason(
  value: number,
  options: Readonly<{ allowNegative: boolean }>,
): IntegerValidationReason | null {
  if (!Number.isFinite(value)) {
    return "not_finite";
  }

  if (!Number.isInteger(value)) {
    return "not_integer";
  }

  if (!Number.isSafeInteger(value)) {
    return "unsafe_integer";
  }

  if (!options.allowNegative && value < 0) {
    return "negative";
  }

  return null;
}

function invalidIntegerResult<T>(
  code: DomainErrorCode,
  path: string,
  reason: IntegerValidationReason,
): Result<T, DomainError> {
  return failure(createDomainError(code, { path, details: { reason } }));
}

function moneyFromValidatedMinorUnits(minorUnits: number): Money {
  return Object.freeze({ currency: MONEY_CURRENCY, minorUnits }) as Money;
}

function adjustmentFromValidatedMinorUnits(minorUnits: number): PriceAdjustment {
  return Object.freeze({ currency: MONEY_CURRENCY, minorUnits }) as PriceAdjustment;
}

export function createMoney(minorUnits: number): Result<Money, DomainError> {
  const reason = getIntegerValidationReason(minorUnits, { allowNegative: false });

  if (reason !== null) {
    return invalidIntegerResult(DOMAIN_ERROR_CODES.invalidMoney, "minorUnits", reason);
  }

  return success(moneyFromValidatedMinorUnits(minorUnits));
}

export function createPriceAdjustment(minorUnits: number): Result<PriceAdjustment, DomainError> {
  const reason = getIntegerValidationReason(minorUnits, { allowNegative: true });

  if (reason !== null) {
    return invalidIntegerResult(DOMAIN_ERROR_CODES.invalidPriceAdjustment, "minorUnits", reason);
  }

  return success(adjustmentFromValidatedMinorUnits(minorUnits));
}

export function addMoney(left: Money, right: Money): Result<Money, DomainError> {
  const minorUnits = left.minorUnits + right.minorUnits;

  if (!Number.isSafeInteger(minorUnits)) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.moneyOverflow, {
        path: "minorUnits",
        details: { operation: "addition" },
      }),
    );
  }

  return success(moneyFromValidatedMinorUnits(minorUnits));
}

export function multiplyMoney(amount: Money, multiplier: number): Result<Money, DomainError> {
  const reason = getIntegerValidationReason(multiplier, { allowNegative: false });

  if (reason !== null) {
    return invalidIntegerResult(DOMAIN_ERROR_CODES.invalidMoneyMultiplier, "multiplier", reason);
  }

  const minorUnits = amount.minorUnits * multiplier;

  if (!Number.isSafeInteger(minorUnits)) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.moneyOverflow, {
        path: "minorUnits",
        details: { operation: "multiplication" },
      }),
    );
  }

  return success(moneyFromValidatedMinorUnits(minorUnits));
}

export function applyPriceAdjustment(
  amount: Money,
  adjustment: PriceAdjustment,
): Result<Money, DomainError> {
  const minorUnits = amount.minorUnits + adjustment.minorUnits;

  if (!Number.isSafeInteger(minorUnits)) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.moneyOverflow, {
        path: "minorUnits",
        details: { operation: "price_adjustment" },
      }),
    );
  }

  if (minorUnits < 0) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.negativeMoneyResult, {
        path: "minorUnits",
        details: { operation: "price_adjustment" },
      }),
    );
  }

  return success(moneyFromValidatedMinorUnits(minorUnits));
}
