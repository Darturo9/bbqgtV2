import { describe, expect, it } from "vitest";

import { type DomainError } from "../shared/domain-error.js";
import { type Result } from "../shared/result.js";
import {
  addMoney,
  applyPriceAdjustment,
  createMoney,
  createPriceAdjustment,
  multiplyMoney,
  sumPriceAdjustments,
  type Money,
  type PriceAdjustment,
} from "./money.js";

function getSuccess<T>(result: Result<T, DomainError>): T {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }

  return result.value;
}

describe("Money", () => {
  it.each([0, 1, 7_550, Number.MAX_SAFE_INTEGER])(
    "creates GTQ from %s minor units",
    (minorUnits) => {
      const money = getSuccess(createMoney(minorUnits));

      expect(money).toEqual({ currency: "GTQ", minorUnits });
      expect(Object.isFrozen(money)).toBe(true);
    },
  );

  it.each([
    [-1, "negative"],
    [1.5, "not_integer"],
    [Number.POSITIVE_INFINITY, "not_finite"],
    [Number.MAX_SAFE_INTEGER + 1, "unsafe_integer"],
  ] as const)("rejects invalid money %s", (minorUnits, reason) => {
    expect(createMoney(minorUnits)).toEqual({
      ok: false,
      error: {
        code: "INVALID_MONEY",
        path: "minorUnits",
        details: { reason },
      },
    });
  });

  it.each([-500, 0, 500])("creates signed price adjustment %s", (minorUnits) => {
    const adjustment = getSuccess(createPriceAdjustment(minorUnits));

    expect(adjustment).toEqual({ currency: "GTQ", minorUnits });
    expect(Object.isFrozen(adjustment)).toBe(true);
  });

  it.each([
    [1.5, "not_integer"],
    [Number.NEGATIVE_INFINITY, "not_finite"],
    [Number.MAX_SAFE_INTEGER + 1, "unsafe_integer"],
  ] as const)("rejects invalid adjustment %s", (minorUnits, reason) => {
    expect(createPriceAdjustment(minorUnits)).toEqual({
      ok: false,
      error: {
        code: "INVALID_PRICE_ADJUSTMENT",
        path: "minorUnits",
        details: { reason },
      },
    });
  });

  it("sums positive and negative price adjustments", () => {
    const adjustments = [
      getSuccess(createPriceAdjustment(2_000)),
      getSuccess(createPriceAdjustment(-500)),
      getSuccess(createPriceAdjustment(250)),
    ];

    expect(sumPriceAdjustments(adjustments)).toEqual({
      ok: true,
      value: { currency: "GTQ", minorUnits: 1_750 },
    });
  });

  it("rejects an unsafe price adjustment sum", () => {
    const maximum = getSuccess(createPriceAdjustment(Number.MAX_SAFE_INTEGER));

    expect(sumPriceAdjustments([maximum, maximum])).toMatchObject({
      ok: false,
      error: { code: "MONEY_OVERFLOW", details: { operation: "price_adjustment_sum" } },
    });
  });

  it("adds two amounts without mutating either input", () => {
    const left = getSuccess(createMoney(7_550));
    const right = getSuccess(createMoney(450));

    expect(addMoney(left, right)).toEqual({
      ok: true,
      value: { currency: "GTQ", minorUnits: 8_000 },
    });
    expect(left.minorUnits).toBe(7_550);
    expect(right.minorUnits).toBe(450);
  });

  it("rejects an unsafe addition", () => {
    const maximum = getSuccess(createMoney(Number.MAX_SAFE_INTEGER));
    const one = getSuccess(createMoney(1));

    expect(addMoney(maximum, one)).toMatchObject({
      ok: false,
      error: { code: "MONEY_OVERFLOW", details: { operation: "addition" } },
    });
  });

  it("multiplies an amount by a non-negative integer", () => {
    const amount = getSuccess(createMoney(1_250));

    expect(multiplyMoney(amount, 3)).toEqual({
      ok: true,
      value: { currency: "GTQ", minorUnits: 3_750 },
    });
  });

  it.each([
    [-1, "negative"],
    [1.5, "not_integer"],
  ] as const)("rejects invalid multiplier %s", (multiplier, reason) => {
    const amount = getSuccess(createMoney(1_250));

    expect(multiplyMoney(amount, multiplier)).toEqual({
      ok: false,
      error: {
        code: "INVALID_MONEY_MULTIPLIER",
        path: "multiplier",
        details: { reason },
      },
    });
  });

  it("rejects an unsafe multiplication", () => {
    const amount = getSuccess(createMoney(Number.MAX_SAFE_INTEGER));

    expect(multiplyMoney(amount, 2)).toMatchObject({
      ok: false,
      error: { code: "MONEY_OVERFLOW", details: { operation: "multiplication" } },
    });
  });

  it("applies a signed adjustment", () => {
    const amount: Money = getSuccess(createMoney(10_000));
    const adjustment: PriceAdjustment = getSuccess(createPriceAdjustment(-1_000));

    expect(applyPriceAdjustment(amount, adjustment)).toEqual({
      ok: true,
      value: { currency: "GTQ", minorUnits: 9_000 },
    });
  });

  it("allows an adjustment to reduce an amount to zero", () => {
    const amount = getSuccess(createMoney(1_000));
    const adjustment = getSuccess(createPriceAdjustment(-1_000));

    expect(applyPriceAdjustment(amount, adjustment)).toEqual({
      ok: true,
      value: { currency: "GTQ", minorUnits: 0 },
    });
  });

  it("rejects an adjustment that produces a negative amount", () => {
    const amount = getSuccess(createMoney(1_000));
    const adjustment = getSuccess(createPriceAdjustment(-1_001));

    expect(applyPriceAdjustment(amount, adjustment)).toMatchObject({
      ok: false,
      error: { code: "NEGATIVE_MONEY_RESULT" },
    });
  });
});
