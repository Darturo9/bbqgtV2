import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { CatalogReadResult } from "../model/catalog-read-result";
import { createConfiguredCatalogService } from "./create-catalog-service";

export function getCatalogCacheTag(brandSlug: string, locationSlug: string): string {
  return `catalog:${brandSlug}:${locationSlug}`;
}

export async function getCachedCatalog(
  brandSlug: string,
  locationSlug: string,
): Promise<CatalogReadResult> {
  "use cache";

  cacheLife("catalog");
  cacheTag(getCatalogCacheTag(brandSlug, locationSlug));

  return createConfiguredCatalogService().read(brandSlug, locationSlug);
}
