import "server-only";

import { readCatalogEnvironment } from "./catalog-environment";
import {
  createCatalogService,
  type CatalogFailureLogEntry,
  type CatalogService,
  type CatalogServiceLogger,
} from "./catalog-service";
import type { CatalogRepository } from "./catalog-repository";
import { createSupabaseCatalogRepository } from "./supabase-catalog-repository";
import { createCatalogSupabaseClient } from "./supabase-client";

const SAFE_CAUSE_FIELDS = Object.freeze([
  "code",
  "kind",
  "name",
  "operation",
  "path",
  "reason",
  "variableName",
] as const);

function summarizeCause(cause: unknown): Readonly<Record<string, string | number | boolean>> {
  if (typeof cause !== "object" || cause === null) {
    return Object.freeze({ type: typeof cause });
  }

  const source = cause as Readonly<Record<string, unknown>>;
  const summary: Record<string, string | number | boolean> = {};

  for (const field of SAFE_CAUSE_FIELDS) {
    const value = source[field];

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      summary[field] = value;
    }
  }

  return Object.freeze(Object.keys(summary).length === 0 ? { type: "object" } : summary);
}

const serverCatalogLogger: CatalogServiceLogger = Object.freeze({
  error(entry: CatalogFailureLogEntry) {
    const { cause, ...context } = entry;

    console.error("Catalog read failed.", {
      ...context,
      cause: summarizeCause(cause),
    });
  },
});

function failingRepository(cause: unknown): CatalogRepository {
  return Object.freeze({
    async load() {
      throw cause;
    },
  });
}

export function createConfiguredCatalogService(
  environment: NodeJS.ProcessEnv = process.env,
  logger: CatalogServiceLogger = serverCatalogLogger,
): CatalogService {
  try {
    const catalogEnvironment = readCatalogEnvironment(environment);
    const client = createCatalogSupabaseClient(catalogEnvironment);
    const repository = createSupabaseCatalogRepository(client);

    return createCatalogService({ repository, logger });
  } catch (cause) {
    return createCatalogService({ repository: failingRepository(cause), logger });
  }
}
