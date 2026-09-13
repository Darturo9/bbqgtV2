import { describe, expect, it } from "vitest";

import {
  CatalogEnvironmentError,
  readCatalogEnvironment,
  type CatalogEnvironmentVariable,
} from "./catalog-environment";

const VALID_ENVIRONMENT: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:54321/",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local-test-value",
  CATALOG_BRAND_SLUG: "bbqbros",
  CATALOG_LOCATION_SLUG: "sucursal-demo-norte",
};

function environmentWith(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return { ...VALID_ENVIRONMENT, ...overrides };
}

function captureEnvironmentError(environment: NodeJS.ProcessEnv): CatalogEnvironmentError {
  try {
    readCatalogEnvironment(environment);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogEnvironmentError);
    return error as CatalogEnvironmentError;
  }

  throw new Error("Se esperaba un error de configuración.");
}

describe("readCatalogEnvironment", () => {
  it.each([
    ["http://127.0.0.1:54321/", "http://127.0.0.1:54321"],
    ["https://example.supabase.co", "https://example.supabase.co"],
  ])("acepta y normaliza la URL %s", (supabaseUrl, expectedUrl) => {
    const result = readCatalogEnvironment(environmentWith({ SUPABASE_URL: supabaseUrl }));

    expect(result).toEqual({
      supabaseUrl: expectedUrl,
      supabasePublishableKey: "sb_publishable_local-test-value",
      brandSlug: "bbqbros",
      locationSlug: "sucursal-demo-norte",
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each<CatalogEnvironmentVariable>([
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "CATALOG_BRAND_SLUG",
    "CATALOG_LOCATION_SLUG",
  ])("rechaza la variable requerida ausente %s", (variableName) => {
    const environment = environmentWith({});
    delete environment[variableName];

    expect(captureEnvironmentError(environment)).toMatchObject({
      code: "missing",
      variableName,
    });
  });

  it.each([
    "not-a-url",
    "ftp://example.supabase.co",
    "https://user:password@example.supabase.co",
    "https://example.supabase.co/rest/v1",
    "https://example.supabase.co?debug=true",
    "https://example.supabase.co#fragment",
  ])("rechaza la URL inválida %s", (supabaseUrl) => {
    expect(captureEnvironmentError(environmentWith({ SUPABASE_URL: supabaseUrl }))).toMatchObject({
      code: "invalid",
      variableName: "SUPABASE_URL",
    });
  });

  it.each([
    "sb_secret_sensitive-value",
    "eyJhbGciOiJIUzI1NiJ9.legacy.jwt",
    "sb_publishable_",
    "sb_publishable_contains whitespace",
    "publishable_without_prefix",
  ])("rechaza una llave que no tiene el formato publicable vigente", (publishableKey) => {
    expect(
      captureEnvironmentError(environmentWith({ SUPABASE_PUBLISHABLE_KEY: publishableKey })),
    ).toMatchObject({
      code: "invalid",
      variableName: "SUPABASE_PUBLISHABLE_KEY",
    });
  });

  it.each([
    ["CATALOG_BRAND_SLUG", "BBQBros"],
    ["CATALOG_BRAND_SLUG", "bbq_bros"],
    ["CATALOG_LOCATION_SLUG", "sucursal norte"],
    ["CATALOG_LOCATION_SLUG", "-sucursal-norte"],
    ["CATALOG_LOCATION_SLUG", "sucursal-norte-"],
    ["CATALOG_LOCATION_SLUG", "   "],
  ] satisfies readonly (readonly [CatalogEnvironmentVariable, string])[])(
    "rechaza el slug inválido de %s",
    (variableName, value) => {
      expect(captureEnvironmentError(environmentWith({ [variableName]: value }))).toMatchObject({
        code: "invalid",
        variableName,
      });
    },
  );

  it("no expone el valor recibido en el error", () => {
    const sensitiveValue = "sb_secret_do-not-echo-this-value";
    const error = captureEnvironmentError(
      environmentWith({ SUPABASE_PUBLISHABLE_KEY: sensitiveValue }),
    );

    expect(error.message).not.toContain(sensitiveValue);
    expect(JSON.stringify(error)).not.toContain(sensitiveValue);
  });
});
