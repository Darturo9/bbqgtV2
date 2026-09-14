import { connection } from "next/server";
import { Suspense } from "react";

import { CatalogContent, CatalogLoading } from "@/features/catalog/components/catalog-content";
import type { CatalogReadResult } from "@/features/catalog/model/catalog-read-result";
import { getCachedCatalog } from "@/features/catalog/server/cached-catalog";
import { readCatalogEnvironment } from "@/features/catalog/server/catalog-environment";
import { readCatalogFailure } from "@/features/catalog/server/create-catalog-service";

export async function DynamicCatalog() {
  await connection();

  let brandSlug = "unconfigured";
  let locationSlug = "unconfigured";
  let result: CatalogReadResult;

  try {
    const environment = readCatalogEnvironment();
    brandSlug = environment.brandSlug;
    locationSlug = environment.locationSlug;

    result = await getCachedCatalog(brandSlug, locationSlug);
  } catch (cause) {
    result = await readCatalogFailure(cause, brandSlug, locationSlug);
  }

  return <CatalogContent result={result} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <DynamicCatalog />
    </Suspense>
  );
}
