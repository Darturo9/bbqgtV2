import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "./domain-error.js";
import { failure, success, type Result } from "./result.js";

declare const identifierBrand: unique symbol;

export type IdentifierKind =
  "brand" | "location" | "category" | "product" | "modifierGroup" | "modifierOption";

type Identifier<Kind extends IdentifierKind> = string & {
  readonly [identifierBrand]: Kind;
};

export type BrandId = Identifier<"brand">;
export type LocationId = Identifier<"location">;
export type CategoryId = Identifier<"category">;
export type ProductId = Identifier<"product">;
export type ModifierGroupId = Identifier<"modifierGroup">;
export type ModifierOptionId = Identifier<"modifierOption">;

type IdentifierByKind = Readonly<{
  brand: BrandId;
  location: LocationId;
  category: CategoryId;
  product: ProductId;
  modifierGroup: ModifierGroupId;
  modifierOption: ModifierOptionId;
}>;

export function createIdentifier<Kind extends IdentifierKind>(
  kind: Kind,
  externalValue: string,
): Result<IdentifierByKind[Kind], DomainError> {
  const normalizedValue = externalValue.trim();

  if (normalizedValue.length === 0) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.invalidIdentifier, {
        path: kind,
        details: { reason: "empty" },
      }),
    );
  }

  return success(normalizedValue as IdentifierByKind[Kind]);
}
