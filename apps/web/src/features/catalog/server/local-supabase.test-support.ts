import { execFileSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

type LocalSupabaseStatus = Readonly<Record<string, unknown>>;

export type LocalSupabaseTestEnvironment = Readonly<{
  supabaseUrl: string;
  supabasePublishableKey: string;
}>;

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../../../../", import.meta.url));
const VERSIONED_SUPABASE_CLI = join(REPOSITORY_ROOT, "node_modules", ".bin", "supabase");
const PUBLISHABLE_KEY_PREFIX = "sb_publishable_";

let cachedEnvironment: LocalSupabaseTestEnvironment | undefined;

function requiredStatusValue(status: LocalSupabaseStatus, name: string): string {
  const value = status[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Supabase local no entregó ${name}.`);
  }

  return value;
}

function readLocalStatus(): LocalSupabaseStatus {
  try {
    accessSync(VERSIONED_SUPABASE_CLI, constants.X_OK);

    const output = execFileSync(
      VERSIONED_SUPABASE_CLI,
      ["status", "-o", "json", "--agent", "no", "--workdir", REPOSITORY_ROOT],
      {
        cwd: REPOSITORY_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const status: unknown = JSON.parse(output);

    if (typeof status !== "object" || status === null || Array.isArray(status)) {
      throw new Error("Supabase local entregó un estado inválido.");
    }

    return status as LocalSupabaseStatus;
  } catch {
    throw new Error(
      "No fue posible leer Supabase local con la CLI versionada. Ejecuta `pnpm db:start` antes de esta prueba.",
    );
  }
}

export function readLocalSupabaseTestEnvironment(): LocalSupabaseTestEnvironment {
  if (cachedEnvironment !== undefined) {
    return cachedEnvironment;
  }

  const status = readLocalStatus();
  const supabaseUrl = requiredStatusValue(status, "API_URL");
  const supabasePublishableKey = requiredStatusValue(status, "PUBLISHABLE_KEY");
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("Supabase local entregó una API_URL inválida.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Supabase local entregó una API_URL con protocolo inválido.");
  }

  if (!supabasePublishableKey.startsWith(PUBLISHABLE_KEY_PREFIX)) {
    throw new Error("Supabase local no entregó una clave publicable actual.");
  }

  cachedEnvironment = Object.freeze({
    supabaseUrl: parsedUrl.origin,
    supabasePublishableKey,
  });

  return cachedEnvironment;
}
