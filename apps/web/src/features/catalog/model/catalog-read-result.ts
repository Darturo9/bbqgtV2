import type { CatalogSnapshot } from "./catalog-snapshot";

export type CatalogReadSuccess = Readonly<{
  status: "success";
  snapshot: CatalogSnapshot;
}>;

export type CatalogReadEmpty = Readonly<{
  status: "empty";
  brandName: string;
  locationName: string;
}>;

export type CatalogReadNotFound = Readonly<{
  status: "not_found";
}>;

export type CatalogReadFailure = Readonly<{
  status: "failure";
  reference: string;
}>;

export type CatalogReadResult =
  CatalogReadSuccess | CatalogReadEmpty | CatalogReadNotFound | CatalogReadFailure;
