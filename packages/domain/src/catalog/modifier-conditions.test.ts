import { describe, expect, it } from "vitest";

import { createPriceAdjustment } from "../money/money.js";
import { type DomainError } from "../shared/domain-error.js";
import { createIdentifier, type BrandId, type ModifierGroupId } from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import { createModifierGroup, createModifierOption, type ModifierGroup } from "./model.js";
import {
  getActiveModifierGroups,
  validateModifierConditions,
  type ModifierCondition,
} from "./modifier-conditions.js";
import { validateModifierSelection } from "./modifier-selection.js";

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

function group(
  value: string,
  overrides: Partial<{ brandId: BrandId; isActive: boolean; optionNames: readonly string[] }> = {},
): ModifierGroup {
  const modifierGroupId = id("modifierGroup", value);
  const groupBrandId = overrides.brandId ?? brandId;
  const optionNames = overrides.optionNames ?? [`${value}-option`];
  const options = optionNames.map((optionName, displayOrder) =>
    getSuccess(
      createModifierOption({
        id: id("modifierOption", optionName),
        brandId: groupBrandId,
        groupId: modifierGroupId,
        name: optionName,
        priceAdjustment: getSuccess(createPriceAdjustment(0)),
        displayOrder,
        isActive: true,
      }),
    ),
  );

  return getSuccess(
    createModifierGroup({
      id: modifierGroupId,
      brandId: groupBrandId,
      name: value,
      selectionType: "single",
      minSelections: 0,
      maxSelections: 1,
      displayOrder: 0,
      isActive: overrides.isActive ?? true,
      options,
    }),
  );
}

function condition(
  parent: ModifierGroup,
  child: ModifierGroup,
  activatingOptionId = parent.options[0]?.id,
): ModifierCondition {
  if (activatingOptionId === undefined) {
    throw new Error("The fixture parent group requires an option");
  }

  return {
    brandId,
    parentGroupId: parent.id,
    activatingOptionId,
    childGroupId: child.id,
  };
}

function activeIds(
  groups: readonly ModifierGroup[],
  conditions: readonly ModifierCondition[],
  selections: Parameters<typeof getActiveModifierGroups>[0]["selections"] = [],
): readonly ModifierGroupId[] {
  const graph = getSuccess(validateModifierConditions({ brandId, groups, conditions }));
  return getSuccess(
    getActiveModifierGroups({ brandId, groups, conditionGraph: graph, selections }),
  ).map((modifierGroup) => modifierGroup.id);
}

describe("modifier conditions", () => {
  it("keeps a conditional child inactive until its parent option is selected", () => {
    const parent = group("parent");
    const child = group("child");
    const rule = condition(parent, child);

    expect(activeIds([parent, child], [rule])).toEqual([parent.id]);

    const selection = getSuccess(
      validateModifierSelection({
        brandId,
        group: parent,
        optionIds: [rule.activatingOptionId],
      }),
    );

    expect(activeIds([parent, child], [rule], [selection])).toEqual([parent.id, child.id]);
  });

  it("uses OR semantics when different options can activate the same child", () => {
    const parent = group("size", { optionNames: ["basic", "premium"] });
    const child = group("sides");
    const premiumOptionId = parent.options[1]?.id;

    if (premiumOptionId === undefined) {
      throw new Error("The fixture requires a premium option");
    }

    const rules = [condition(parent, child), condition(parent, child, premiumOptionId)];
    const selection = getSuccess(
      validateModifierSelection({ brandId, group: parent, optionIds: [premiumOptionId] }),
    );

    expect(activeIds([parent, child], rules, [selection])).toEqual([parent.id, child.id]);
  });

  it("activates transitive children only through active parent groups", () => {
    const root = group("root");
    const middle = group("middle");
    const leaf = group("leaf");
    const rootRule = condition(root, middle);
    const middleRule = condition(middle, leaf);
    const middleSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: middle,
        optionIds: [middleRule.activatingOptionId],
      }),
    );

    expect(activeIds([root, middle, leaf], [rootRule, middleRule], [middleSelection])).toEqual([
      root.id,
    ]);

    const rootSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: root,
        optionIds: [rootRule.activatingOptionId],
      }),
    );

    expect(
      activeIds([root, middle, leaf], [rootRule, middleRule], [rootSelection, middleSelection]),
    ).toEqual([root.id, middle.id, leaf.id]);
  });

  it("omits editorially inactive groups even when their condition is satisfied", () => {
    const parent = group("parent-active");
    const child = group("child-inactive", { isActive: false });
    const rule = condition(parent, child);
    const selection = getSuccess(
      validateModifierSelection({
        brandId,
        group: parent,
        optionIds: [rule.activatingOptionId],
      }),
    );

    expect(activeIds([parent, child], [rule], [selection])).toEqual([parent.id]);
  });

  it("rejects self references", () => {
    const modifierGroup = group("self");

    expect(
      validateModifierConditions({
        brandId,
        groups: [modifierGroup],
        conditions: [condition(modifierGroup, modifierGroup)],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_MODIFIER_DEPENDENCY", details: { reason: "self_reference" } },
    });
  });

  it.each(["parent", "child"] as const)("rejects a missing %s group", (missingSide) => {
    const parent = group("known-parent");
    const child = group("known-child");
    const groups = missingSide === "parent" ? [child] : [parent];

    expect(
      validateModifierConditions({ brandId, groups, conditions: [condition(parent, child)] }),
    ).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_MODIFIER_DEPENDENCY",
        details: { reason: `${missingSide}_group_not_found` },
      },
    });
  });

  it("rejects an activating option that does not belong to the parent group", () => {
    const parent = group("option-parent");
    const child = group("option-child");
    const foreignOptionId = child.options[0]?.id;

    if (foreignOptionId === undefined) {
      throw new Error("The fixture child group requires an option");
    }

    expect(
      validateModifierConditions({
        brandId,
        groups: [parent, child],
        conditions: [condition(parent, child, foreignOptionId)],
      }),
    ).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_MODIFIER_DEPENDENCY",
        details: { reason: "activating_option_not_found_in_parent" },
      },
    });
  });

  it("rejects duplicate conditions", () => {
    const parent = group("duplicate-parent");
    const child = group("duplicate-child");
    const rule = condition(parent, child);

    expect(
      validateModifierConditions({
        brandId,
        groups: [parent, child],
        conditions: [rule, rule],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_MODIFIER_DEPENDENCY", details: { reason: "duplicate_condition" } },
    });
  });

  it("rejects direct and indirect cycles", () => {
    const first = group("cycle-first");
    const second = group("cycle-second");
    const third = group("cycle-third");

    expect(
      validateModifierConditions({
        brandId,
        groups: [first, second],
        conditions: [condition(first, second), condition(second, first)],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_MODIFIER_DEPENDENCY", details: { reason: "cycle" } },
    });

    expect(
      validateModifierConditions({
        brandId,
        groups: [first, second, third],
        conditions: [condition(first, second), condition(second, third), condition(third, first)],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_MODIFIER_DEPENDENCY", details: { reason: "cycle" } },
    });
  });

  it("rejects groups, conditions and graphs from another brand", () => {
    const foreign = group("foreign", { brandId: otherBrandId });

    expect(
      validateModifierConditions({ brandId, groups: [foreign], conditions: [] }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });

    const parent = group("brand-parent");
    const child = group("brand-child");
    expect(
      validateModifierConditions({
        brandId,
        groups: [parent, child],
        conditions: [{ ...condition(parent, child), brandId: otherBrandId }],
      }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });

    const graph = getSuccess(
      validateModifierConditions({ brandId, groups: [parent], conditions: [] }),
    );
    expect(
      getActiveModifierGroups({
        brandId: otherBrandId,
        groups: [],
        conditionGraph: graph,
        selections: [],
      }),
    ).toMatchObject({ ok: false, error: { code: "MODIFIER_BRAND_MISMATCH" } });
  });
});
