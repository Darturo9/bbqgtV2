import { describe, expect, it } from "vitest";

import { createModifierGroup, createModifierOption, type ModifierGroup } from "../catalog/model.js";
import { validateModifierSelection } from "../catalog/modifier-selection.js";
import { createPriceAdjustment } from "../money/money.js";
import { type DomainError } from "../shared/domain-error.js";
import { createIdentifier } from "../shared/identifier.js";
import { type Result } from "../shared/result.js";
import { normalizeSpecialInstructions, type SpecialInstructions } from "./instructions.js";
import { createCartLineKey } from "./line-key.js";

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

function group(value: string, optionIds: readonly string[]): ModifierGroup {
  const groupId = id("modifierGroup", value);
  const options = optionIds.map((optionId, displayOrder) =>
    getSuccess(
      createModifierOption({
        id: id("modifierOption", optionId),
        brandId,
        groupId,
        name: optionId,
        priceAdjustment: getSuccess(createPriceAdjustment(0)),
        displayOrder,
        isActive: true,
      }),
    ),
  );

  return getSuccess(
    createModifierGroup({
      id: groupId,
      brandId,
      name: value,
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: options.length,
      displayOrder: 0,
      isActive: true,
      options,
    }),
  );
}

function instructions(value: string): SpecialInstructions {
  const result = getSuccess(normalizeSpecialInstructions(value));

  if (result === undefined) {
    throw new Error("The fixture instructions cannot be empty");
  }

  return result;
}

function optionAt(modifierGroup: ModifierGroup, index: number) {
  const option = modifierGroup.options[index];

  if (option === undefined) {
    throw new Error(`The fixture group requires option ${String(index)}`);
  }

  return option;
}

describe("cart line key", () => {
  it("ignores selection and option input order", () => {
    const firstGroup = group("first", ["a", "b"]);
    const secondGroup = group("second", ["c"]);
    const firstSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: firstGroup,
        optionIds: [optionAt(firstGroup, 1).id, optionAt(firstGroup, 0).id],
      }),
    );
    const secondSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: secondGroup,
        optionIds: [optionAt(secondGroup, 0).id],
      }),
    );
    const productId = id("product", "product-1");

    expect(
      createCartLineKey({
        productId,
        modifierSelections: [firstSelection, secondSelection],
      }),
    ).toBe(
      createCartLineKey({
        productId,
        modifierSelections: [secondSelection, firstSelection],
      }),
    );
  });

  it("changes when selected options change", () => {
    const modifierGroup = group("options", ["first-option", "second-option"]);
    const firstSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [optionAt(modifierGroup, 0).id],
      }),
    );
    const secondSelection = getSuccess(
      validateModifierSelection({
        brandId,
        group: modifierGroup,
        optionIds: [optionAt(modifierGroup, 1).id],
      }),
    );
    const productId = id("product", "product-options");

    expect(createCartLineKey({ productId, modifierSelections: [firstSelection] })).not.toBe(
      createCartLineKey({ productId, modifierSelections: [secondSelection] }),
    );
  });

  it("ignores optional selections that contain no options", () => {
    const optionalGroup = group("optional-empty", ["unused-option"]);
    const emptySelection = getSuccess(
      validateModifierSelection({ brandId, group: optionalGroup, optionIds: [] }),
    );
    const productId = id("product", "product-empty-selection");

    expect(createCartLineKey({ productId, modifierSelections: [emptySelection] })).toBe(
      createCartLineKey({ productId, modifierSelections: [] }),
    );
  });

  it("changes when normalized instructions change", () => {
    const productId = id("product", "product-instructions");

    expect(
      createCartLineKey({
        productId,
        modifierSelections: [],
        instructions: instructions("Sin cebolla"),
      }),
    ).not.toBe(
      createCartLineKey({
        productId,
        modifierSelections: [],
        instructions: instructions("Salsa aparte"),
      }),
    );
  });

  it("changes when the product changes", () => {
    expect(
      createCartLineKey({ productId: id("product", "first"), modifierSelections: [] }),
    ).not.toBe(createCartLineKey({ productId: id("product", "second"), modifierSelections: [] }));
  });

  it("uses structured encoding so delimiter-like values cannot collide", () => {
    expect(
      createCartLineKey({
        productId: id("product", "product:[one]"),
        modifierSelections: [],
        instructions: instructions("two,three"),
      }),
    ).not.toBe(
      createCartLineKey({
        productId: id("product", "product"),
        modifierSelections: [],
        instructions: instructions("[one],two,three"),
      }),
    );
  });
});
