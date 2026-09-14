import "server-only";

import {
  createIdentifier,
  createModifierGroup,
  createModifierOption,
  createMoney,
  createPriceAdjustment,
  createProductPrice,
  failure,
  getEffectivePrice,
  resolveModifierGroupsForProduct,
  resolveProductAvailability,
  success,
  validateModifierConditions,
  type CategoryId,
  type DomainError,
  type IdentifierKind,
  type ModifierGroup,
  type ModifierGroupId,
  type ModifierOption,
  type ModifierOptionId,
  type ModifierSelectionType,
  type Result,
} from "@bbqbros/domain";

import type {
  CatalogCategory,
  CatalogProduct,
  CatalogProductImage,
  CatalogSnapshot,
} from "../model/catalog-snapshot";
import type { CatalogSource } from "./catalog-source";

export const CATALOG_MAPPING_ERROR_CODES = Object.freeze({
  invalidSource: "invalid_source",
});

export type CatalogMappingError = Readonly<{
  code: (typeof CATALOG_MAPPING_ERROR_CODES)[keyof typeof CATALOG_MAPPING_ERROR_CODES];
  cause: unknown;
}>;

export type CatalogMappingResult = Result<CatalogSnapshot, CatalogMappingError>;

type CatalogSourceIssue = Readonly<{
  kind: "catalog_source_validation";
  path: string;
  reason: string;
}>;

class CatalogMappingAbort {
  constructor(readonly originalCause: unknown) {}
}

function invalidSource(path: string, reason: string): never {
  const issue: CatalogSourceIssue = Object.freeze({
    kind: "catalog_source_validation",
    path,
    reason,
  });

  throw new CatalogMappingAbort(issue);
}

function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) {
    throw new CatalogMappingAbort(result.error);
  }

  return result.value;
}

function requiredText(value: string, path: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return invalidSource(path, "empty");
  }

  return normalized;
}

function optionalText(value: string | undefined): Readonly<{ description?: string }> {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0
    ? Object.freeze({})
    : Object.freeze({ description: normalized });
}

function displayOrder(value: number, path: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    return invalidSource(path, "invalid_non_negative_integer");
  }

  return value;
}

function selectionType(value: string, path: string): ModifierSelectionType {
  if (value !== "single" && value !== "multiple") {
    return invalidSource(path, "invalid_selection_type");
  }

  return value;
}

function identifier<Kind extends IdentifierKind>(kind: Kind, value: string) {
  return unwrap(createIdentifier(kind, value));
}

function ensureEqual(actual: string, expected: string, path: string, reason: string): void {
  if (actual !== expected) {
    invalidSource(path, reason);
  }
}

function ensureUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) {
    invalidSource(path, "duplicate");
  }
}

function compareCatalogRows(
  left: Readonly<{ displayOrder: number; name: string; id: string }>,
  right: Readonly<{ displayOrder: number; name: string; id: string }>,
): number {
  return (
    left.displayOrder - right.displayOrder ||
    left.name.localeCompare(right.name, "es-GT") ||
    left.id.localeCompare(right.id)
  );
}

function publicImage(
  imageUrl: string | undefined,
  productName: string,
  brandName: string,
  path: string,
): CatalogProductImage {
  const alt = `${productName} de ${brandName}`;

  if (imageUrl === undefined) {
    return Object.freeze({ kind: "placeholder", alt });
  }

  const src = requiredText(imageUrl, path);
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(src);
  } catch {
    return invalidSource(path, "invalid_url");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return invalidSource(path, "invalid_url_protocol");
  }

  return Object.freeze({ kind: "public", src, alt });
}

function createMappingFailure(cause: unknown): CatalogMappingResult {
  return failure(
    Object.freeze({
      code: CATALOG_MAPPING_ERROR_CODES.invalidSource,
      cause,
    }),
  );
}

export function mapCatalogSource(source: CatalogSource): CatalogMappingResult {
  try {
    if (source.brand.currencyCode !== "GTQ") {
      invalidSource("brand.currencyCode", "unsupported_currency");
    }

    const brandId = identifier("brand", source.brand.id);
    const locationId = identifier("location", source.location.id);
    const brandName = requiredText(source.brand.name, "brand.name");
    const brandSlug = requiredText(source.brand.slug, "brand.slug");
    const locationName = requiredText(source.location.name, "location.name");
    const locationSlug = requiredText(source.location.slug, "location.slug");

    ensureEqual(source.location.brandId.trim(), brandId, "location.brandId", "brand_mismatch");
    ensureUnique(
      source.categories.map(({ id }) => id.trim()),
      "categories.id",
    );
    ensureUnique(
      source.products.map(({ id }) => id.trim()),
      "products.id",
    );
    ensureUnique(
      source.modifierGroups.map(({ id }) => id.trim()),
      "modifierGroups.id",
    );
    ensureUnique(
      source.modifierOptions.map(({ id }) => id.trim()),
      "modifierOptions.id",
    );
    ensureUnique(
      source.locationProducts.map(
        ({ brandId: rowBrandId, locationId: rowLocationId, productId }) =>
          `${rowBrandId.trim()}:${rowLocationId.trim()}:${productId.trim()}`,
      ),
      "locationProducts",
    );
    ensureUnique(
      source.locationModifierOptions.map(
        ({ brandId: rowBrandId, locationId: rowLocationId, modifierOptionId }) =>
          `${rowBrandId.trim()}:${rowLocationId.trim()}:${modifierOptionId.trim()}`,
      ),
      "locationModifierOptions",
    );

    const categories = source.categories.map((category, index) => {
      const id = identifier("category", category.id);
      ensureEqual(
        category.brandId.trim(),
        brandId,
        `categories.${index}.brandId`,
        "brand_mismatch",
      );

      return Object.freeze({
        id,
        slug: requiredText(category.slug, `categories.${index}.slug`),
        name: requiredText(category.name, `categories.${index}.name`),
        ...optionalText(category.description),
        displayOrder: displayOrder(category.displayOrder, `categories.${index}.displayOrder`),
        isActive: category.isActive,
      });
    });
    const categoryById = new Map<CategoryId, (typeof categories)[number]>(
      categories.map((category) => [category.id, category]),
    );

    const products = source.products.map((product, index) => {
      const id = identifier("product", product.id);
      const categoryId = identifier("category", product.categoryId);
      ensureEqual(product.brandId.trim(), brandId, `products.${index}.brandId`, "brand_mismatch");

      if (!categoryById.has(categoryId)) {
        invalidSource(`products.${index}.categoryId`, "category_not_found");
      }

      const regular = unwrap(createMoney(product.regularPriceCents));
      const sale =
        product.offerPriceCents === undefined
          ? undefined
          : unwrap(createMoney(product.offerPriceCents));
      const price = unwrap(
        createProductPrice({ regular, ...(sale === undefined ? {} : { sale }) }),
      );

      return Object.freeze({
        id,
        categoryId,
        slug: requiredText(product.slug, `products.${index}.slug`),
        name: requiredText(product.name, `products.${index}.name`),
        ...optionalText(product.description),
        price,
        imageUrl: product.imageUrl,
        displayOrder: displayOrder(product.displayOrder, `products.${index}.displayOrder`),
        isActive: product.isActive,
      });
    });
    const productById = new Map<string, (typeof products)[number]>(
      products.map((product) => [product.id, product]),
    );

    const options = source.modifierOptions.map((option, index) => {
      const optionBrandId = identifier("brand", option.brandId);
      const groupId = identifier("modifierGroup", option.modifierGroupId);
      ensureEqual(optionBrandId, brandId, `modifierOptions.${index}.brandId`, "brand_mismatch");

      return unwrap(
        createModifierOption({
          id: identifier("modifierOption", option.id),
          brandId: optionBrandId,
          groupId,
          name: option.name,
          ...optionalText(option.description),
          priceAdjustment: unwrap(createPriceAdjustment(option.priceAdjustmentCents)),
          displayOrder: option.displayOrder,
          isActive: option.isActive,
        }),
      );
    });
    const optionsByGroupId = new Map<ModifierGroupId, ModifierOption[]>();

    for (const option of options) {
      const groupOptions = optionsByGroupId.get(option.groupId) ?? [];
      groupOptions.push(option);
      optionsByGroupId.set(option.groupId, groupOptions);
    }

    const groups = source.modifierGroups.map((group, index) => {
      const groupBrandId = identifier("brand", group.brandId);
      const id = identifier("modifierGroup", group.id);
      ensureEqual(groupBrandId, brandId, `modifierGroups.${index}.brandId`, "brand_mismatch");

      return unwrap(
        createModifierGroup({
          id,
          brandId: groupBrandId,
          name: group.name,
          ...optionalText(group.description),
          selectionType: selectionType(
            group.selectionType,
            `modifierGroups.${index}.selectionType`,
          ),
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
          displayOrder: group.displayOrder,
          isActive: group.isActive,
          options: Object.freeze([...(optionsByGroupId.get(id) ?? [])].sort(compareCatalogRows)),
        }),
      );
    });
    const groupById = new Map<ModifierGroupId, ModifierGroup>(
      groups.map((group) => [group.id, group]),
    );
    const optionById = new Map<ModifierOptionId, ModifierOption>(
      options.map((option) => [option.id, option]),
    );

    for (const [index, option] of options.entries()) {
      if (!groupById.has(option.groupId)) {
        invalidSource(`modifierOptions.${index}.modifierGroupId`, "modifier_group_not_found");
      }
    }

    const categoryAssignments = source.categoryModifierGroups.map((assignment, index) => {
      const assignmentBrandId = identifier("brand", assignment.brandId);
      const categoryId = identifier("category", assignment.categoryId);
      const groupId = identifier("modifierGroup", assignment.modifierGroupId);
      ensureEqual(
        assignmentBrandId,
        brandId,
        `categoryModifierGroups.${index}.brandId`,
        "brand_mismatch",
      );

      if (!categoryById.has(categoryId)) {
        invalidSource(`categoryModifierGroups.${index}.categoryId`, "category_not_found");
      }

      if (!groupById.has(groupId)) {
        invalidSource(
          `categoryModifierGroups.${index}.modifierGroupId`,
          "modifier_group_not_found",
        );
      }

      const excludedProductIds = source.categoryModifierGroupExclusions
        .filter(
          (exclusion) =>
            exclusion.categoryId.trim() === categoryId &&
            exclusion.modifierGroupId.trim() === groupId,
        )
        .map((exclusion) => identifier("product", exclusion.productId));

      return Object.freeze({
        brandId: assignmentBrandId,
        categoryId,
        groupId,
        excludedProductIds: Object.freeze(excludedProductIds),
      });
    });
    ensureUnique(
      categoryAssignments.map(({ categoryId, groupId }) => `${categoryId}:${groupId}`),
      "categoryModifierGroups",
    );

    const categoryAssignmentKeys = new Set(
      categoryAssignments.map(({ categoryId, groupId }) => `${categoryId}:${groupId}`),
    );
    for (const [index, exclusion] of source.categoryModifierGroupExclusions.entries()) {
      const exclusionBrandId = identifier("brand", exclusion.brandId);
      const categoryId = identifier("category", exclusion.categoryId);
      const groupId = identifier("modifierGroup", exclusion.modifierGroupId);
      const productId = identifier("product", exclusion.productId);
      ensureEqual(
        exclusionBrandId,
        brandId,
        `categoryModifierGroupExclusions.${index}.brandId`,
        "brand_mismatch",
      );

      if (!categoryAssignmentKeys.has(`${categoryId}:${groupId}`)) {
        invalidSource(`categoryModifierGroupExclusions.${index}`, "category_assignment_not_found");
      }

      if (productById.get(productId)?.categoryId !== categoryId) {
        invalidSource(
          `categoryModifierGroupExclusions.${index}.productId`,
          "product_category_mismatch",
        );
      }
    }

    const productAssignments = source.productModifierGroups.map((assignment, index) => {
      const assignmentBrandId = identifier("brand", assignment.brandId);
      const productId = identifier("product", assignment.productId);
      const groupId = identifier("modifierGroup", assignment.modifierGroupId);
      ensureEqual(
        assignmentBrandId,
        brandId,
        `productModifierGroups.${index}.brandId`,
        "brand_mismatch",
      );

      if (!productById.has(productId)) {
        invalidSource(`productModifierGroups.${index}.productId`, "product_not_found");
      }

      if (!groupById.has(groupId)) {
        invalidSource(`productModifierGroups.${index}.modifierGroupId`, "modifier_group_not_found");
      }

      return Object.freeze({ brandId: assignmentBrandId, productId, groupId });
    });
    ensureUnique(
      productAssignments.map(({ productId, groupId }) => `${productId}:${groupId}`),
      "productModifierGroups",
    );

    const conditions = source.modifierConditions.map((condition, index) => {
      const conditionBrandId = identifier("brand", condition.brandId);
      ensureEqual(
        conditionBrandId,
        brandId,
        `modifierConditions.${index}.brandId`,
        "brand_mismatch",
      );

      return Object.freeze({
        brandId: conditionBrandId,
        parentGroupId: identifier("modifierGroup", condition.parentModifierGroupId),
        activatingOptionId: identifier("modifierOption", condition.activatingModifierOptionId),
        childGroupId: identifier("modifierGroup", condition.childModifierGroupId),
      });
    });
    const conditionGraph = unwrap(validateModifierConditions({ brandId, groups, conditions }));

    const availableProductIds = source.locationProducts.flatMap((availability, index) => {
      ensureEqual(
        availability.brandId.trim(),
        brandId,
        `locationProducts.${index}.brandId`,
        "brand_mismatch",
      );
      ensureEqual(
        availability.locationId.trim(),
        locationId,
        `locationProducts.${index}.locationId`,
        "location_mismatch",
      );
      const productId = identifier("product", availability.productId);
      if (!productById.has(productId)) {
        invalidSource(`locationProducts.${index}.productId`, "product_not_found");
      }
      return availability.isAvailable ? [productId] : [];
    });
    const availableModifierOptionIds = source.locationModifierOptions.flatMap(
      (availability, index) => {
        ensureEqual(
          availability.brandId.trim(),
          brandId,
          `locationModifierOptions.${index}.brandId`,
          "brand_mismatch",
        );
        ensureEqual(
          availability.locationId.trim(),
          locationId,
          `locationModifierOptions.${index}.locationId`,
          "location_mismatch",
        );
        const optionId = identifier("modifierOption", availability.modifierOptionId);
        if (!optionById.has(optionId)) {
          invalidSource(`locationModifierOptions.${index}.modifierOptionId`, "option_not_found");
        }
        return availability.isAvailable ? [optionId] : [];
      },
    );
    const locationAvailability = Object.freeze({
      brandId,
      locationId,
      availableProductIds: Object.freeze(availableProductIds),
      availableModifierOptionIds: Object.freeze(availableModifierOptionIds),
    });

    const mappedProductsByCategory = new Map<CategoryId, CatalogProduct[]>();

    for (const product of products) {
      const resolvedGroups = unwrap(
        resolveModifierGroupsForProduct({
          brandId,
          categoryId: product.categoryId,
          productId: product.id,
          groups,
          categoryAssignments,
          productAssignments,
        }),
      );
      const availability = unwrap(
        resolveProductAvailability({
          brandId,
          locationId,
          product: Object.freeze({ id: product.id, brandId, isActive: product.isActive }),
          modifierGroups: Object.freeze(resolvedGroups.map(({ group }) => group)),
          conditionGraph,
          selections: Object.freeze([]),
          locationAvailability,
        }),
      );

      if (!availability.isAvailable) {
        continue;
      }

      const effectivePrice = getEffectivePrice(product.price);
      const mappedProduct: CatalogProduct = Object.freeze({
        id: product.id,
        slug: product.slug,
        name: product.name,
        ...optionalText(product.description),
        regularPriceCents: product.price.regular.minorUnits,
        currentPriceCents: effectivePrice.minorUnits,
        isOnOffer: product.price.sale !== undefined,
        image: publicImage(
          product.imageUrl,
          product.name,
          brandName,
          `products.${product.id}.imageUrl`,
        ),
        isCustomizable: availability.modifierGroups.some(
          ({ availableOptions }) => availableOptions.length > 0,
        ),
      });
      const categoryProducts = mappedProductsByCategory.get(product.categoryId) ?? [];
      categoryProducts.push(mappedProduct);
      mappedProductsByCategory.set(product.categoryId, categoryProducts);
    }

    const mappedCategories: CatalogCategory[] = categories
      .filter(({ isActive }) => isActive)
      .sort(compareCatalogRows)
      .map((category) =>
        Object.freeze({
          id: category.id,
          slug: category.slug,
          name: category.name,
          ...optionalText(category.description),
          products: Object.freeze(
            [...(mappedProductsByCategory.get(category.id) ?? [])].sort((left, right) => {
              const leftSource = productById.get(left.id);
              const rightSource = productById.get(right.id);
              if (leftSource === undefined || rightSource === undefined) {
                return left.id.localeCompare(right.id);
              }
              return compareCatalogRows(leftSource, rightSource);
            }),
          ),
        }),
      );

    return success(
      Object.freeze({
        brand: Object.freeze({
          id: brandId,
          slug: brandSlug,
          name: brandName,
          currencyCode: "GTQ" as const,
        }),
        location: Object.freeze({ id: locationId, slug: locationSlug, name: locationName }),
        categories: Object.freeze(mappedCategories),
      }),
    );
  } catch (cause) {
    return createMappingFailure(cause instanceof CatalogMappingAbort ? cause.originalCause : cause);
  }
}
