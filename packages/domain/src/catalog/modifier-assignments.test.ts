import { describe, expect, it } from "vitest";

import { createPriceAdjustment } from "../money/money.js";
import { type DomainError } from "../shared/domain-error.js";
import { createIdentifier, type BrandId } from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import { createModifierGroup, createModifierOption, type ModifierGroup } from "./model.js";
import {
  resolveModifierGroupsForProduct,
  type CategoryModifierAssignment,
  type ProductModifierAssignment,
} from "./modifier-assignments.js";

function getSuccess<T>(result: Result<T, DomainError>): T {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }

  return result.value;
}

function id<Kind extends Parameters<typeof createIdentifier>[0]>(kind: Kind, value: string) {
  return getSuccess(createIdentifier(kind, value));
}

const brandId = id("brand", "brand-1");
const otherBrandId = id("brand", "brand-2");
const categoryId = id("category", "burgers");
const otherCategoryId = id("category", "wings");
const productId = id("product", "classic-burger");
const otherProductId = id("product", "premium-burger");

function group(value: string, groupBrandId: BrandId = brandId): ModifierGroup {
  const groupId = id("modifierGroup", value);
  const option = getSuccess(
    createModifierOption({
      id: id("modifierOption", `${value}-option`),
      brandId: groupBrandId,
      groupId,
      name: value,
      priceAdjustment: getSuccess(createPriceAdjustment(0)),
      displayOrder: 0,
      isActive: true,
    }),
  );

  return getSuccess(
    createModifierGroup({
      id: groupId,
      brandId: groupBrandId,
      name: value,
      selectionType: "single",
      minSelections: 0,
      maxSelections: 1,
      displayOrder: 0,
      isActive: true,
      options: [option],
    }),
  );
}

function categoryAssignment(
  modifierGroup: ModifierGroup,
  overrides: Partial<CategoryModifierAssignment> = {},
): CategoryModifierAssignment {
  return {
    brandId,
    categoryId,
    groupId: modifierGroup.id,
    excludedProductIds: [],
    ...overrides,
  };
}

function productAssignment(
  modifierGroup: ModifierGroup,
  overrides: Partial<ProductModifierAssignment> = {},
): ProductModifierAssignment {
  return {
    brandId,
    productId,
    groupId: modifierGroup.id,
    ...overrides,
  };
}

function resolve(
  groups: readonly ModifierGroup[],
  categoryAssignments: readonly CategoryModifierAssignment[],
  productAssignments: readonly ProductModifierAssignment[],
) {
  return resolveModifierGroupsForProduct({
    brandId,
    categoryId,
    productId,
    groups,
    categoryAssignments,
    productAssignments,
  });
}

describe("modifier assignments", () => {
  it("inherits category groups and appends direct product groups", () => {
    const inherited = group("inherited");
    const direct = group("direct");
    const result = getSuccess(
      resolve([inherited, direct], [categoryAssignment(inherited)], [productAssignment(direct)]),
    );

    expect(result.map(({ group: modifierGroup, source }) => [modifierGroup.id, source])).toEqual([
      [inherited.id, "category"],
      [direct.id, "product"],
    ]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("respects a product exclusion from a category assignment", () => {
    const inherited = group("excluded");

    expect(
      getSuccess(
        resolve(
          [inherited],
          [categoryAssignment(inherited, { excludedProductIds: [productId] })],
          [],
        ),
      ),
    ).toEqual([]);
  });

  it("allows an excluded category group to be assigned directly", () => {
    const modifierGroup = group("excluded-then-direct");
    const result = getSuccess(
      resolve(
        [modifierGroup],
        [categoryAssignment(modifierGroup, { excludedProductIds: [productId] })],
        [productAssignment(modifierGroup)],
      ),
    );

    expect(result).toMatchObject([{ group: { id: modifierGroup.id }, source: "product" }]);
  });

  it("ignores assignments for other categories and products", () => {
    const unrelatedCategoryGroup = group("other-category");
    const unrelatedProductGroup = group("other-product");

    expect(
      getSuccess(
        resolve(
          [unrelatedCategoryGroup, unrelatedProductGroup],
          [categoryAssignment(unrelatedCategoryGroup, { categoryId: otherCategoryId })],
          [productAssignment(unrelatedProductGroup, { productId: otherProductId })],
        ),
      ),
    ).toEqual([]);
  });

  it("rejects an effective duplicate inherited or direct group", () => {
    const modifierGroup = group("duplicate");

    expect(
      resolve(
        [modifierGroup],
        [categoryAssignment(modifierGroup), categoryAssignment(modifierGroup)],
        [],
      ),
    ).toMatchObject({ ok: false, error: { code: "DUPLICATE_EFFECTIVE_MODIFIER_GROUP" } });

    expect(
      resolve(
        [modifierGroup],
        [categoryAssignment(modifierGroup)],
        [productAssignment(modifierGroup)],
      ),
    ).toMatchObject({ ok: false, error: { code: "DUPLICATE_EFFECTIVE_MODIFIER_GROUP" } });
  });

  it("rejects an assignment to an unknown group", () => {
    const unknown = group("unknown");

    expect(resolve([], [categoryAssignment(unknown)], [])).toMatchObject({
      ok: false,
      error: { code: "MODIFIER_GROUP_NOT_FOUND" },
    });

    expect(
      resolve([], [], [productAssignment(unknown, { productId: otherProductId })]),
    ).toMatchObject({
      ok: false,
      error: { code: "MODIFIER_GROUP_NOT_FOUND", path: "productAssignments" },
    });
  });

  it("rejects duplicate product exclusions", () => {
    const modifierGroup = group("duplicate-exclusion");

    expect(
      resolve(
        [modifierGroup],
        [categoryAssignment(modifierGroup, { excludedProductIds: [productId, productId] })],
        [],
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_MODIFIER_ASSIGNMENT",
        details: { reason: "duplicate_product_exclusion" },
      },
    });
  });

  it("rejects groups and assignments from another brand", () => {
    const localGroup = group("local");
    const foreignGroup = group("foreign", otherBrandId);

    expect(resolve([foreignGroup], [], [])).toMatchObject({
      ok: false,
      error: { code: "MODIFIER_BRAND_MISMATCH" },
    });

    expect(
      resolve([localGroup], [categoryAssignment(localGroup, { brandId: otherBrandId })], []),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });

    expect(
      resolve([localGroup], [], [productAssignment(localGroup, { brandId: otherBrandId })]),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });
  });
});
