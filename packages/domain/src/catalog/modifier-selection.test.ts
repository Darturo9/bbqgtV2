import { describe, expect, it } from "vitest";

import { createMoney, createPriceAdjustment, type Money } from "../money/money.js";
import { type DomainError } from "../shared/domain-error.js";
import { createIdentifier, type BrandId, type ModifierGroupId } from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import {
  createModifierGroup,
  createModifierOption,
  isModifierGroupRequired,
  type CreateModifierGroupInput,
  type ModifierGroup,
  type ModifierOption,
} from "./model.js";
import { calculateConfiguredPrice, validateModifierSelection } from "./modifier-selection.js";

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
const groupId = id("modifierGroup", "group-1");

function money(minorUnits: number): Money {
  return getSuccess(createMoney(minorUnits));
}

function option(
  optionId: string,
  overrides: Partial<{
    brandId: BrandId;
    groupId: ModifierGroupId;
    name: string;
    adjustment: number;
    displayOrder: number;
    isActive: boolean;
  }> = {},
): ModifierOption {
  return getSuccess(
    createModifierOption({
      id: id("modifierOption", optionId),
      brandId: overrides.brandId ?? brandId,
      groupId: overrides.groupId ?? groupId,
      name: overrides.name ?? optionId,
      priceAdjustment: getSuccess(createPriceAdjustment(overrides.adjustment ?? 0)),
      displayOrder: overrides.displayOrder ?? 0,
      isActive: overrides.isActive ?? true,
    }),
  );
}

function group(overrides: Partial<CreateModifierGroupInput> = {}): ModifierGroup {
  return getSuccess(
    createModifierGroup({
      id: groupId,
      brandId,
      name: "Elige acompañamiento",
      selectionType: "single",
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 0,
      isActive: true,
      options: [option("option-1"), option("option-2", { displayOrder: 1 })],
      ...overrides,
    }),
  );
}

describe("modifier model", () => {
  it("creates and normalizes an option", () => {
    const result = createModifierOption({
      id: id("modifierOption", "option-normalized"),
      brandId,
      groupId,
      name: "  Papas fritas  ",
      description: "  Incluidas  ",
      priceAdjustment: getSuccess(createPriceAdjustment(0)),
      displayOrder: 1,
      isActive: true,
    });

    expect(result).toMatchObject({
      ok: true,
      value: { name: "Papas fritas", description: "Incluidas" },
    });
  });

  it("rejects an empty option name", () => {
    expect(
      createModifierOption({
        id: id("modifierOption", "option-empty"),
        brandId,
        groupId,
        name: "  ",
        priceAdjustment: getSuccess(createPriceAdjustment(0)),
        displayOrder: 0,
        isActive: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_MODIFIER_OPTION", path: "name" } });
  });

  it.each([
    ["single", 0, 1, false],
    ["single", 1, 1, true],
    ["multiple", 0, 2, false],
    ["multiple", 1, 2, true],
  ] as const)(
    "creates %s group with range %s..%s",
    (selectionType, minSelections, maxSelections, required) => {
      const modifierGroup = group({ selectionType, minSelections, maxSelections });

      expect(isModifierGroupRequired(modifierGroup)).toBe(required);
      expect(Object.isFrozen(modifierGroup)).toBe(true);
      expect(Object.isFrozen(modifierGroup.options)).toBe(true);
    },
  );

  it.each([
    ["single", 0, 2, "selectionType"],
    ["single", 2, 1, "minSelections"],
    ["multiple", -1, 1, "minSelections"],
    ["multiple", 2, 1, "minSelections"],
    ["multiple", 0, 3, "maxSelections"],
  ] as const)(
    "rejects contradictory %s range %s..%s",
    (selectionType, minSelections, maxSelections, path) => {
      expect(
        createModifierGroup({
          id: groupId,
          brandId,
          name: "Grupo",
          selectionType,
          minSelections,
          maxSelections,
          displayOrder: 0,
          isActive: true,
          options: [option("range-1"), option("range-2")],
        }),
      ).toMatchObject({ ok: false, error: { code: "INVALID_MODIFIER_GROUP", path } });
    },
  );

  it("rejects duplicate options", () => {
    const duplicate = option("duplicate");

    expect(
      createModifierGroup({
        id: groupId,
        brandId,
        name: "Grupo",
        selectionType: "single",
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 0,
        isActive: true,
        options: [duplicate, duplicate],
      }),
    ).toMatchObject({ ok: false, error: { code: "DUPLICATE_MODIFIER_OPTION" } });
  });

  it("rejects an option from another brand", () => {
    expect(
      createModifierGroup({
        id: groupId,
        brandId,
        name: "Grupo",
        selectionType: "single",
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 0,
        isActive: true,
        options: [option("other-brand", { brandId: otherBrandId })],
      }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });
  });

  it("rejects an option assigned to another group", () => {
    expect(
      createModifierGroup({
        id: groupId,
        brandId,
        name: "Grupo",
        selectionType: "single",
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 0,
        isActive: true,
        options: [option("other-group", { groupId: id("modifierGroup", "group-2") })],
      }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_GROUP_MISMATCH" } });
  });
});

describe("validateModifierSelection", () => {
  it("validates a required single selection", () => {
    const selectedOption = option("selected");
    const modifierGroup = group({ options: [selectedOption] });

    expect(
      validateModifierSelection({ brandId, group: modifierGroup, optionIds: [selectedOption.id] }),
    ).toMatchObject({
      ok: true,
      value: { groupId, options: [{ id: selectedOption.id }] },
    });
  });

  it("returns selected options in canonical display order", () => {
    const first = option("first", { displayOrder: 0 });
    const second = option("second", { displayOrder: 1 });
    const modifierGroup = group({
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: 2,
      options: [second, first],
    });
    const result = getSuccess(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [second.id, first.id],
      }),
    );

    expect(result.options.map((selected) => selected.id)).toEqual([first.id, second.id]);
  });

  it("rejects a missing required selection", () => {
    expect(validateModifierSelection({ brandId, group: group(), optionIds: [] })).toMatchObject({
      ok: false,
      error: { code: "REQUIRED_SELECTION_MISSING" },
    });
  });

  it("accepts an empty optional selection with a zero adjustment", () => {
    expect(
      validateModifierSelection({ brandId, group: group({ minSelections: 0 }), optionIds: [] }),
    ).toEqual({
      ok: true,
      value: {
        groupId,
        options: [],
        priceAdjustment: { currency: "GTQ", minorUnits: 0 },
      },
    });
  });

  it("rejects selections below or above the configured range", () => {
    const firstOption = option("range-first");
    const secondOption = option("range-second");
    const modifierGroup = group({
      selectionType: "multiple",
      minSelections: 2,
      maxSelections: 2,
      options: [firstOption, secondOption],
    });

    expect(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [firstOption.id],
      }),
    ).toMatchObject({ ok: false, error: { code: "SELECTION_LIMIT_EXCEEDED" } });

    const optionalGroup = group({ minSelections: 0 });
    expect(
      validateModifierSelection({
        brandId,
        group: optionalGroup,
        optionIds: optionalGroup.options.map((selected) => selected.id),
      }),
    ).toMatchObject({ ok: false, error: { code: "SELECTION_LIMIT_EXCEEDED" } });
  });

  it("rejects duplicate, unknown and inactive options", () => {
    const inactive = option("inactive", { isActive: false });
    const active = option("active");
    const modifierGroup = group({ options: [active, inactive] });

    expect(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [active.id, active.id],
      }),
    ).toMatchObject({ ok: false, error: { code: "DUPLICATE_MODIFIER_SELECTION" } });
    expect(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [id("modifierOption", "unknown")],
      }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_OPTION_NOT_FOUND" } });
    expect(
      validateModifierSelection({ brandId, group: modifierGroup, optionIds: [inactive.id] }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_OPTION_NOT_ACTIVE" } });
  });

  it("rejects a group from another brand or an inactive group", () => {
    expect(
      validateModifierSelection({ brandId: otherBrandId, group: group(), optionIds: [] }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });
    expect(
      validateModifierSelection({ brandId, group: group({ isActive: false }), optionIds: [] }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_GROUP_NOT_ACTIVE" } });
  });

  it("calculates the configured price from all selections", () => {
    const comboOption = option("combo", { adjustment: 2_000 });
    const firstGroup = group({
      options: [comboOption],
    });
    const secondGroupId = id("modifierGroup", "group-2");
    const secondOption = option("beer", { groupId: secondGroupId, adjustment: 1_500 });
    const secondGroup = group({
      id: secondGroupId,
      name: "Bebida",
      options: [secondOption],
    });
    const firstSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: firstGroup,
        optionIds: [comboOption.id],
      }),
    );
    const secondSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: secondGroup,
        optionIds: [secondOption.id],
      }),
    );

    expect(calculateConfiguredPrice(money(10_000), [firstSelection, secondSelection])).toEqual({
      ok: true,
      value: { currency: "GTQ", minorUnits: 13_500 },
    });
  });

  it("rejects a configured price below zero", () => {
    const creditOption = option("credit", { adjustment: -10_001 });
    const discounted = group({ options: [creditOption] });
    const selection = getSuccess(
      validateModifierSelection({
        brandId,
        group: discounted,
        optionIds: [creditOption.id],
      }),
    );

    expect(calculateConfiguredPrice(money(10_000), [selection])).toMatchObject({
      ok: false,
      error: { code: "NEGATIVE_MONEY_RESULT" },
    });
  });
});
