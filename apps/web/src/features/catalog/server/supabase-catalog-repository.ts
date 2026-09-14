import "server-only";

import {
  CATALOG_REPOSITORY_ERROR_CODES,
  type CatalogRepository,
  type CatalogRepositoryFailure,
  type CatalogRepositoryOperation,
  type CatalogRepositoryResult,
} from "./catalog-repository";
import type { CatalogSource } from "./catalog-source";
import type { CatalogSupabaseClient } from "./supabase-client";

const CATALOG_BUCKET = "catalog";

function createFailure(
  operation: CatalogRepositoryOperation,
  cause: unknown,
): CatalogRepositoryFailure {
  return Object.freeze({
    status: "failure",
    error: Object.freeze({
      code: CATALOG_REPOSITORY_ERROR_CODES.readFailed,
      operation,
      cause,
    }),
  });
}

function optionalText(value: string | null): Readonly<{ description?: string }> {
  return value === null ? Object.freeze({}) : Object.freeze({ description: value });
}

function resolveProductImage(
  client: CatalogSupabaseClient,
  imagePath: string | null,
): Readonly<{ imageUrl?: string }> {
  if (imagePath === null) {
    return Object.freeze({});
  }

  const { data } = client.storage.from(CATALOG_BUCKET).getPublicUrl(imagePath);

  return Object.freeze({ imageUrl: data.publicUrl });
}

function firstCatalogFailure(
  results: readonly Readonly<{ data: unknown; error: unknown }>[],
): unknown | undefined {
  for (const result of results) {
    if (result.error !== null) {
      return result.error;
    }

    if (result.data === null) {
      return Object.freeze({ code: "missing_catalog_query_data" });
    }
  }

  return undefined;
}

export function createSupabaseCatalogRepository(client: CatalogSupabaseClient): CatalogRepository {
  async function load(brandSlug: string, locationSlug: string): Promise<CatalogRepositoryResult> {
    let operation: CatalogRepositoryOperation = "brand";

    try {
      const brandResult = await client
        .from("brands")
        .select("id,name,slug,currency_code")
        .eq("slug", brandSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (brandResult.error !== null) {
        return createFailure(operation, brandResult.error);
      }

      if (brandResult.data === null) {
        return Object.freeze({ status: "not_found" });
      }

      const brand = brandResult.data;
      operation = "location";

      const locationResult = await client
        .from("locations")
        .select("id,brand_id,name,slug")
        .eq("brand_id", brand.id)
        .eq("slug", locationSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (locationResult.error !== null) {
        return createFailure(operation, locationResult.error);
      }

      if (locationResult.data === null) {
        return Object.freeze({ status: "not_found" });
      }

      const location = locationResult.data;
      operation = "catalog";

      const [
        categoriesResult,
        productsResult,
        modifierGroupsResult,
        modifierOptionsResult,
        categoryModifierGroupsResult,
        categoryModifierGroupExclusionsResult,
        productModifierGroupsResult,
        modifierConditionsResult,
        locationProductsResult,
        locationModifierOptionsResult,
      ] = await Promise.all([
        client
          .from("categories")
          .select("id,brand_id,name,slug,description,display_order,is_active")
          .eq("brand_id", brand.id)
          .eq("is_active", true),
        client
          .from("products")
          .select(
            "id,brand_id,category_id,name,slug,description,regular_price_cents,offer_price_cents,image_path,display_order,is_active",
          )
          .eq("brand_id", brand.id)
          .eq("is_active", true),
        client
          .from("modifier_groups")
          .select(
            "id,brand_id,name,description,selection_type,min_selections,max_selections,display_order,is_active",
          )
          .eq("brand_id", brand.id)
          .eq("is_active", true),
        client
          .from("modifier_options")
          .select(
            "id,brand_id,modifier_group_id,name,description,price_adjustment_cents,display_order,is_active",
          )
          .eq("brand_id", brand.id)
          .eq("is_active", true),
        client
          .from("category_modifier_groups")
          .select("brand_id,category_id,modifier_group_id")
          .eq("brand_id", brand.id),
        client
          .from("category_modifier_group_exclusions")
          .select("brand_id,category_id,modifier_group_id,product_id")
          .eq("brand_id", brand.id),
        client
          .from("product_modifier_groups")
          .select("brand_id,product_id,modifier_group_id")
          .eq("brand_id", brand.id),
        client
          .from("modifier_conditions")
          .select(
            "brand_id,parent_modifier_group_id,activating_modifier_option_id,child_modifier_group_id",
          )
          .eq("brand_id", brand.id),
        client
          .from("location_products")
          .select("brand_id,location_id,product_id,is_available")
          .eq("brand_id", brand.id)
          .eq("location_id", location.id)
          .eq("is_available", true),
        client
          .from("location_modifier_options")
          .select("brand_id,location_id,modifier_option_id,is_available")
          .eq("brand_id", brand.id)
          .eq("location_id", location.id)
          .eq("is_available", true),
      ]);

      const catalogFailure = firstCatalogFailure([
        categoriesResult,
        productsResult,
        modifierGroupsResult,
        modifierOptionsResult,
        categoryModifierGroupsResult,
        categoryModifierGroupExclusionsResult,
        productModifierGroupsResult,
        modifierConditionsResult,
        locationProductsResult,
        locationModifierOptionsResult,
      ]);

      if (catalogFailure !== undefined) {
        return createFailure(operation, catalogFailure);
      }

      const source: CatalogSource = Object.freeze({
        brand: Object.freeze({
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          currencyCode: brand.currency_code,
        }),
        location: Object.freeze({
          id: location.id,
          brandId: location.brand_id,
          name: location.name,
          slug: location.slug,
        }),
        categories: Object.freeze(
          (categoriesResult.data ?? []).map((category) =>
            Object.freeze({
              id: category.id,
              brandId: category.brand_id,
              name: category.name,
              slug: category.slug,
              ...optionalText(category.description),
              displayOrder: category.display_order,
              isActive: category.is_active,
            }),
          ),
        ),
        products: Object.freeze(
          (productsResult.data ?? []).map((product) =>
            Object.freeze({
              id: product.id,
              brandId: product.brand_id,
              categoryId: product.category_id,
              name: product.name,
              slug: product.slug,
              ...optionalText(product.description),
              regularPriceCents: product.regular_price_cents,
              ...(product.offer_price_cents === null
                ? {}
                : { offerPriceCents: product.offer_price_cents }),
              ...resolveProductImage(client, product.image_path),
              displayOrder: product.display_order,
              isActive: product.is_active,
            }),
          ),
        ),
        modifierGroups: Object.freeze(
          (modifierGroupsResult.data ?? []).map((group) =>
            Object.freeze({
              id: group.id,
              brandId: group.brand_id,
              name: group.name,
              ...optionalText(group.description),
              selectionType: group.selection_type,
              minSelections: group.min_selections,
              maxSelections: group.max_selections,
              displayOrder: group.display_order,
              isActive: group.is_active,
            }),
          ),
        ),
        modifierOptions: Object.freeze(
          (modifierOptionsResult.data ?? []).map((option) =>
            Object.freeze({
              id: option.id,
              brandId: option.brand_id,
              modifierGroupId: option.modifier_group_id,
              name: option.name,
              ...optionalText(option.description),
              priceAdjustmentCents: option.price_adjustment_cents,
              displayOrder: option.display_order,
              isActive: option.is_active,
            }),
          ),
        ),
        categoryModifierGroups: Object.freeze(
          (categoryModifierGroupsResult.data ?? []).map((assignment) =>
            Object.freeze({
              brandId: assignment.brand_id,
              categoryId: assignment.category_id,
              modifierGroupId: assignment.modifier_group_id,
            }),
          ),
        ),
        categoryModifierGroupExclusions: Object.freeze(
          (categoryModifierGroupExclusionsResult.data ?? []).map((exclusion) =>
            Object.freeze({
              brandId: exclusion.brand_id,
              categoryId: exclusion.category_id,
              modifierGroupId: exclusion.modifier_group_id,
              productId: exclusion.product_id,
            }),
          ),
        ),
        productModifierGroups: Object.freeze(
          (productModifierGroupsResult.data ?? []).map((assignment) =>
            Object.freeze({
              brandId: assignment.brand_id,
              productId: assignment.product_id,
              modifierGroupId: assignment.modifier_group_id,
            }),
          ),
        ),
        modifierConditions: Object.freeze(
          (modifierConditionsResult.data ?? []).map((condition) =>
            Object.freeze({
              brandId: condition.brand_id,
              parentModifierGroupId: condition.parent_modifier_group_id,
              activatingModifierOptionId: condition.activating_modifier_option_id,
              childModifierGroupId: condition.child_modifier_group_id,
            }),
          ),
        ),
        locationProducts: Object.freeze(
          (locationProductsResult.data ?? []).map((availability) =>
            Object.freeze({
              brandId: availability.brand_id,
              locationId: availability.location_id,
              productId: availability.product_id,
              isAvailable: availability.is_available,
            }),
          ),
        ),
        locationModifierOptions: Object.freeze(
          (locationModifierOptionsResult.data ?? []).map((availability) =>
            Object.freeze({
              brandId: availability.brand_id,
              locationId: availability.location_id,
              modifierOptionId: availability.modifier_option_id,
              isAvailable: availability.is_available,
            }),
          ),
        ),
      });

      return Object.freeze({ status: "found", source });
    } catch (cause) {
      return createFailure(operation, cause);
    }
  }

  return Object.freeze({ load });
}
