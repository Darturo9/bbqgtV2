import { describe, expect, it } from "vitest";

import { createPriceAdjustment } from "../money/money.js";
import { type DomainError } from "../shared/domain-error.js";
import {
  createIdentifier,
  type BrandId,
  type LocationId,
  type ModifierOptionId,
} from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import {
  resolveProductAvailability,
  type LocationAvailability,
  type ProductAvailabilityCandidate,
} from "./availability.js";
import {
  validateModifierConditions,
  type ModifierCondition,
  type ModifierConditionGraph,
} from "./modifier-conditions.js";
import {
  createModifierGroup,
  createModifierOption,
  type ModifierGroup,
  type ModifierOption,
} from "./model.js";
import {
  validateModifierSelection,
  type ValidatedModifierSelection,
} from "./modifier-selection.js";

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
const locationId = id("location", "location-1");
const otherLocationId = id("location", "location-2");
const productId = id("product", "product-1");

type OptionFixture = Readonly<{
  value: string;
  adjustment?: number;
  isActive?: boolean;
}>;

function group(
  value: string,
  optionFixtures: readonly OptionFixture[] = [{ value: `${value}-option` }],
  overrides: Partial<{
    brandId: BrandId;
    minSelections: number;
    maxSelections: number;
    isActive: boolean;
  }> = {},
): ModifierGroup {
  const groupId = id("modifierGroup", value);
  const groupBrandId = overrides.brandId ?? brandId;
  const options = optionFixtures.map((fixture, displayOrder) =>
    getSuccess(
      createModifierOption({
        id: id("modifierOption", fixture.value),
        brandId: groupBrandId,
        groupId,
        name: fixture.value,
        priceAdjustment: getSuccess(createPriceAdjustment(fixture.adjustment ?? 0)),
        displayOrder,
        isActive: fixture.isActive ?? true,
      }),
    ),
  );

  return getSuccess(
    createModifierGroup({
      id: groupId,
      brandId: groupBrandId,
      name: value,
      selectionType: overrides.maxSelections === 1 ? "single" : "multiple",
      minSelections: overrides.minSelections ?? 0,
      maxSelections: overrides.maxSelections ?? options.filter((option) => option.isActive).length,
      displayOrder: 0,
      isActive: overrides.isActive ?? true,
      options,
    }),
  );
}

function graph(
  groups: readonly ModifierGroup[],
  conditions: readonly ModifierCondition[] = [],
  graphBrandId = brandId,
): ModifierConditionGraph {
  return getSuccess(validateModifierConditions({ brandId: graphBrandId, groups, conditions }));
}

function product(
  overrides: Partial<ProductAvailabilityCandidate> = {},
): ProductAvailabilityCandidate {
  return {
    id: productId,
    brandId,
    isActive: true,
    ...overrides,
  };
}

function locationAvailability(
  availableModifierOptionIds: readonly ModifierOptionId[] = [],
  overrides: Partial<LocationAvailability> = {},
): LocationAvailability {
  return {
    brandId,
    locationId,
    availableProductIds: [productId],
    availableModifierOptionIds,
    ...overrides,
  };
}

function resolve(
  modifierGroups: readonly ModifierGroup[],
  availability: LocationAvailability,
  options: Partial<{
    product: ProductAvailabilityCandidate;
    conditionGraph: ModifierConditionGraph;
    selections: readonly ValidatedModifierSelection[];
    brandId: BrandId;
    locationId: LocationId;
  }> = {},
) {
  return resolveProductAvailability({
    brandId: options.brandId ?? brandId,
    locationId: options.locationId ?? locationId,
    product: options.product ?? product(),
    modifierGroups,
    conditionGraph: options.conditionGraph ?? graph(modifierGroups),
    selections: options.selections ?? [],
    locationAvailability: availability,
  });
}

function firstOption(modifierGroup: ModifierGroup): ModifierOption {
  const option = modifierGroup.options[0];

  if (option === undefined) {
    throw new Error("The fixture group requires an option");
  }

  return option;
}

describe("product availability", () => {
  it("resolves an active product enabled at the location", () => {
    const modifierGroup = group("sides", [{ value: "fries" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const option = firstOption(modifierGroup);
    const result = getSuccess(resolve([modifierGroup], locationAvailability([option.id])));

    expect(result).toMatchObject({
      productId,
      locationId,
      isAvailable: true,
      unavailabilityReasons: [],
      blockingModifierGroupIds: [],
      modifierGroups: [{ group: { id: modifierGroup.id }, availableOptions: [{ id: option.id }] }],
    });
  });

  it("reports an editorially inactive product", () => {
    const result = getSuccess(
      resolve([], locationAvailability(), { product: product({ isActive: false }) }),
    );

    expect(result).toMatchObject({
      isAvailable: false,
      unavailabilityReasons: ["product_inactive"],
    });
  });

  it("reports a product disabled at the location", () => {
    const result = getSuccess(resolve([], locationAvailability([], { availableProductIds: [] })));

    expect(result).toMatchObject({
      isAvailable: false,
      unavailabilityReasons: ["product_unavailable"],
    });
  });

  it("reports all simultaneous availability causes in a stable order", () => {
    const requiredGroup = group("required", [{ value: "required-option" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const result = getSuccess(
      resolve([requiredGroup], locationAvailability([], { availableProductIds: [] }), {
        product: product({ isActive: false }),
      }),
    );

    expect(result).toMatchObject({
      isAvailable: false,
      unavailabilityReasons: [
        "product_inactive",
        "product_unavailable",
        "insufficient_modifier_options",
      ],
      blockingModifierGroupIds: [requiredGroup.id],
    });
  });

  it("filters unavailable and inactive options without changing catalog data or prices", () => {
    const modifierGroup = group(
      "extras",
      [
        { value: "available-extra", adjustment: 500 },
        { value: "sold-out-extra", adjustment: 750 },
        { value: "inactive-extra", adjustment: 1_000, isActive: false },
      ],
      { maxSelections: 2 },
    );
    const availableOption = modifierGroup.options[0];
    const soldOutOption = modifierGroup.options[1];

    if (availableOption === undefined || soldOutOption === undefined) {
      throw new Error("The fixture group requires two active options");
    }

    const result = getSuccess(
      resolve(
        [modifierGroup],
        locationAvailability([availableOption.id, soldOutOption.id], {
          availableModifierOptionIds: [availableOption.id],
        }),
      ),
    );

    expect(result.modifierGroups[0]?.availableOptions).toEqual([availableOption]);
    expect(result.modifierGroups[0]?.availableOptions[0]?.priceAdjustment).toBe(
      availableOption.priceAdjustment,
    );
    expect(modifierGroup.options).toHaveLength(3);
  });

  it("blocks a product when an active group cannot satisfy its minimum", () => {
    const modifierGroup = group("two-sides", [{ value: "fries" }, { value: "coleslaw" }], {
      minSelections: 2,
      maxSelections: 2,
    });
    const availableOption = firstOption(modifierGroup);
    const result = getSuccess(resolve([modifierGroup], locationAvailability([availableOption.id])));

    expect(result).toMatchObject({
      isAvailable: false,
      unavailabilityReasons: ["insufficient_modifier_options"],
      blockingModifierGroupIds: [modifierGroup.id],
    });
  });

  it("does not block a product when an optional group has no available options", () => {
    const optionalGroup = group("optional");
    const result = getSuccess(resolve([optionalGroup], locationAvailability()));

    expect(result).toMatchObject({
      isAvailable: true,
      blockingModifierGroupIds: [],
      modifierGroups: [{ availableOptions: [] }],
    });
  });

  it("ignores a conditional required group until its condition becomes active", () => {
    const parent = group("combo", [{ value: "make-combo" }], { maxSelections: 1 });
    const child = group("combo-side", [{ value: "combo-fries" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const activatingOption = firstOption(parent);
    const condition: ModifierCondition = {
      brandId,
      parentGroupId: parent.id,
      activatingOptionId: activatingOption.id,
      childGroupId: child.id,
    };
    const conditionGraph = graph([parent, child], [condition]);
    const availability = locationAvailability([activatingOption.id]);

    expect(getSuccess(resolve([parent, child], availability, { conditionGraph }))).toMatchObject({
      isAvailable: true,
      modifierGroups: [{ group: { id: parent.id } }],
    });

    const selection = getSuccess(
      validateModifierSelection({
        brandId,
        group: parent,
        optionIds: [activatingOption.id],
      }),
    );
    expect(
      getSuccess(
        resolve([parent, child], availability, { conditionGraph, selections: [selection] }),
      ),
    ).toMatchObject({
      isAvailable: false,
      unavailabilityReasons: ["insufficient_modifier_options"],
      blockingModifierGroupIds: [child.id],
    });
  });

  it("does not activate a child from a selection that is unavailable at the location", () => {
    const parent = group("unavailable-parent", [{ value: "unavailable-trigger" }], {
      maxSelections: 1,
    });
    const child = group("unavailable-child", [{ value: "required-child" }], {
      minSelections: 1,
      maxSelections: 1,
    });
    const activatingOption = firstOption(parent);
    const conditionGraph = graph(
      [parent, child],
      [
        {
          brandId,
          parentGroupId: parent.id,
          activatingOptionId: activatingOption.id,
          childGroupId: child.id,
        },
      ],
    );
    const selection = getSuccess(
      validateModifierSelection({
        brandId,
        group: parent,
        optionIds: [activatingOption.id],
      }),
    );
    const result = getSuccess(
      resolve([parent, child], locationAvailability(), {
        conditionGraph,
        selections: [selection],
      }),
    );

    expect(result).toMatchObject({
      isAvailable: true,
      modifierGroups: [{ group: { id: parent.id } }],
    });
  });

  it("rejects a product from another brand", () => {
    expect(
      resolve([], locationAvailability(), {
        product: product({ brandId: otherBrandId }),
      }),
    ).toMatchObject({ ok: false, error: { code: "PRODUCT_BRAND_MISMATCH" } });
  });

  it("rejects availability from another brand or location", () => {
    expect(resolve([], locationAvailability([], { brandId: otherBrandId }))).toMatchObject({
      ok: false,
      error: { code: "LOCATION_AVAILABILITY_MISMATCH" },
    });
    expect(resolve([], locationAvailability([], { locationId: otherLocationId }))).toMatchObject({
      ok: false,
      error: { code: "LOCATION_AVAILABILITY_MISMATCH" },
    });
  });

  it("rejects duplicate product and option availability entries", () => {
    expect(
      resolve([], locationAvailability([], { availableProductIds: [productId, productId] })),
    ).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_LOCATION_AVAILABILITY",
        details: { reason: "duplicate_product" },
      },
    });

    const duplicateOptionId = id("modifierOption", "duplicate-option");
    expect(resolve([], locationAvailability([duplicateOptionId, duplicateOptionId]))).toMatchObject(
      {
        ok: false,
        error: {
          code: "INVALID_LOCATION_AVAILABILITY",
          details: { reason: "duplicate_modifier_option" },
        },
      },
    );
  });

  it("returns an immutable availability projection", () => {
    const modifierGroup = group("immutable");
    const option = firstOption(modifierGroup);
    const result = getSuccess(resolve([modifierGroup], locationAvailability([option.id])));

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.unavailabilityReasons)).toBe(true);
    expect(Object.isFrozen(result.blockingModifierGroupIds)).toBe(true);
    expect(Object.isFrozen(result.modifierGroups)).toBe(true);
    expect(Object.isFrozen(result.modifierGroups[0])).toBe(true);
    expect(Object.isFrozen(result.modifierGroups[0]?.availableOptions)).toBe(true);
  });
});
