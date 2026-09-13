import "server-only";

export const CATALOG_ENVIRONMENT_ERROR_CODES = {
  invalid: "invalid",
  missing: "missing",
} as const;

export type CatalogEnvironmentErrorCode =
  (typeof CATALOG_ENVIRONMENT_ERROR_CODES)[keyof typeof CATALOG_ENVIRONMENT_ERROR_CODES];

export type CatalogEnvironmentVariable =
  "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY" | "CATALOG_BRAND_SLUG" | "CATALOG_LOCATION_SLUG";

export type CatalogEnvironment = Readonly<{
  supabaseUrl: string;
  supabasePublishableKey: string;
  brandSlug: string;
  locationSlug: string;
}>;

export class CatalogEnvironmentError extends Error {
  readonly code: CatalogEnvironmentErrorCode;
  readonly variableName: CatalogEnvironmentVariable;

  constructor(code: CatalogEnvironmentErrorCode, variableName: CatalogEnvironmentVariable) {
    super(`La configuración del catálogo es ${code} para ${variableName}.`);
    this.name = "CatalogEnvironmentError";
    this.code = code;
    this.variableName = variableName;
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLISHABLE_KEY_PREFIX = "sb_publishable_";

function readRequired(
  environment: NodeJS.ProcessEnv,
  variableName: CatalogEnvironmentVariable,
): string {
  const value = environment[variableName];

  if (value === undefined) {
    throw new CatalogEnvironmentError(CATALOG_ENVIRONMENT_ERROR_CODES.missing, variableName);
  }

  return value;
}

function readSupabaseUrl(environment: NodeJS.ProcessEnv): string {
  const variableName = "SUPABASE_URL";
  const value = readRequired(environment, variableName);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new CatalogEnvironmentError(CATALOG_ENVIRONMENT_ERROR_CODES.invalid, variableName);
  }

  if (
    value.trim() !== value ||
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new CatalogEnvironmentError(CATALOG_ENVIRONMENT_ERROR_CODES.invalid, variableName);
  }

  return url.origin;
}

function readPublishableKey(environment: NodeJS.ProcessEnv): string {
  const variableName = "SUPABASE_PUBLISHABLE_KEY";
  const value = readRequired(environment, variableName);

  if (
    !value.startsWith(PUBLISHABLE_KEY_PREFIX) ||
    value.length === PUBLISHABLE_KEY_PREFIX.length ||
    /\s/.test(value)
  ) {
    throw new CatalogEnvironmentError(CATALOG_ENVIRONMENT_ERROR_CODES.invalid, variableName);
  }

  return value;
}

function readSlug(
  environment: NodeJS.ProcessEnv,
  variableName: "CATALOG_BRAND_SLUG" | "CATALOG_LOCATION_SLUG",
): string {
  const value = readRequired(environment, variableName);

  if (!SLUG_PATTERN.test(value)) {
    throw new CatalogEnvironmentError(CATALOG_ENVIRONMENT_ERROR_CODES.invalid, variableName);
  }

  return value;
}

export function readCatalogEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): CatalogEnvironment {
  return Object.freeze({
    supabaseUrl: readSupabaseUrl(environment),
    supabasePublishableKey: readPublishableKey(environment),
    brandSlug: readSlug(environment, "CATALOG_BRAND_SLUG"),
    locationSlug: readSlug(environment, "CATALOG_LOCATION_SLUG"),
  });
}
