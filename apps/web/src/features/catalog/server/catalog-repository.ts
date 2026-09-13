import type { CatalogSource } from "./catalog-source";

export const CATALOG_REPOSITORY_ERROR_CODES = {
  readFailed: "read_failed",
} as const;

export type CatalogRepositoryErrorCode =
  (typeof CATALOG_REPOSITORY_ERROR_CODES)[keyof typeof CATALOG_REPOSITORY_ERROR_CODES];

export type CatalogRepositoryOperation = "brand" | "location" | "catalog";

export type CatalogRepositoryError = Readonly<{
  code: CatalogRepositoryErrorCode;
  operation: CatalogRepositoryOperation;
  cause: unknown;
}>;

export type CatalogRepositoryFound = Readonly<{
  status: "found";
  source: CatalogSource;
}>;

export type CatalogRepositoryNotFound = Readonly<{
  status: "not_found";
}>;

export type CatalogRepositoryFailure = Readonly<{
  status: "failure";
  error: CatalogRepositoryError;
}>;

export type CatalogRepositoryResult =
  CatalogRepositoryFound | CatalogRepositoryNotFound | CatalogRepositoryFailure;

export interface CatalogRepository {
  load(brandSlug: string, locationSlug: string): Promise<CatalogRepositoryResult>;
}
