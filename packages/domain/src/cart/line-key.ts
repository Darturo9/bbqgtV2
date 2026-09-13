import { type ProductId } from "../shared/identifier.js";
import { type ValidatedModifierSelection } from "../catalog/modifier-selection.js";
import { type SpecialInstructions } from "./instructions.js";

declare const cartLineKeyBrand: unique symbol;

export type CartLineKey = string & {
  readonly [cartLineKeyBrand]: true;
};

export function createCartLineKey(
  input: Readonly<{
    productId: ProductId;
    modifierSelections: readonly ValidatedModifierSelection[];
    instructions?: SpecialInstructions;
  }>,
): CartLineKey {
  const canonicalSelections = input.modifierSelections
    .map(
      (selection) =>
        [selection.groupId, selection.options.map((option) => option.id).sort()] as const,
    )
    .sort(([leftGroupId], [rightGroupId]) =>
      leftGroupId < rightGroupId ? -1 : leftGroupId > rightGroupId ? 1 : 0,
    );

  return JSON.stringify([
    input.productId,
    canonicalSelections,
    input.instructions ?? null,
  ]) as CartLineKey;
}
