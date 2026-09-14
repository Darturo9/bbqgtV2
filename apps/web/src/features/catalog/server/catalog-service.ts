import "server-only";

import type { CatalogReadResult } from "../model/catalog-read-result";
import { mapCatalogSource } from "./catalog-mapper";
import type { CatalogRepository } from "./catalog-repository";

export type CatalogFailureStage = "repository" | "mapping";

export type CatalogFailureLogEntry = Readonly<{
  event: "catalog_read_failed";
  stage: CatalogFailureStage;
  reference: string;
  brandSlug: string;
  locationSlug: string;
  cause: unknown;
}>;

export interface CatalogServiceLogger {
  error(entry: CatalogFailureLogEntry): void;
}

export interface CatalogService {
  read(brandSlug: string, locationSlug: string): Promise<CatalogReadResult>;
}

type CatalogServiceDependencies = Readonly<{
  repository: CatalogRepository;
  logger: CatalogServiceLogger;
}>;

function hasSellableProducts(result: Extract<CatalogReadResult, { status: "success" }>): boolean {
  return result.snapshot.categories.some(({ products }) => products.length > 0);
}

export function createCatalogService({
  repository,
  logger,
}: CatalogServiceDependencies): CatalogService {
  function failureResult(
    stage: CatalogFailureStage,
    brandSlug: string,
    locationSlug: string,
    cause: unknown,
  ): Extract<CatalogReadResult, { status: "failure" }> {
    const reference = crypto.randomUUID();
    const entry: CatalogFailureLogEntry = Object.freeze({
      event: "catalog_read_failed",
      stage,
      reference,
      brandSlug,
      locationSlug,
      cause,
    });

    try {
      logger.error(entry);
    } catch {
      // Un fallo secundario del logger no debe exponer ni reemplazar el error original.
    }

    return Object.freeze({ status: "failure", reference });
  }

  async function read(brandSlug: string, locationSlug: string): Promise<CatalogReadResult> {
    let repositoryResult: Awaited<ReturnType<CatalogRepository["load"]>>;

    try {
      repositoryResult = await repository.load(brandSlug, locationSlug);
    } catch (cause) {
      return failureResult("repository", brandSlug, locationSlug, cause);
    }

    if (repositoryResult.status === "not_found") {
      return Object.freeze({ status: "not_found" });
    }

    if (repositoryResult.status === "failure") {
      return failureResult("repository", brandSlug, locationSlug, repositoryResult.error.cause);
    }

    const mappingResult = mapCatalogSource(repositoryResult.source);

    if (!mappingResult.ok) {
      return failureResult("mapping", brandSlug, locationSlug, mappingResult.error.cause);
    }

    const successResult = Object.freeze({
      status: "success" as const,
      snapshot: mappingResult.value,
    });

    if (!hasSellableProducts(successResult)) {
      return Object.freeze({
        status: "empty",
        brandName: mappingResult.value.brand.name,
        locationName: mappingResult.value.location.name,
      });
    }

    return successResult;
  }

  return Object.freeze({ read });
}
