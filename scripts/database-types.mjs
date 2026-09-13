import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const VALID_MODES = new Set(["write", "check"]);
const mode = process.argv[2];

if (!VALID_MODES.has(mode)) {
  console.error("Uso: node scripts/database-types.mjs <write|check>");
  process.exit(2);
}

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedFile = path.join(
  repositoryRoot,
  "packages",
  "contracts",
  "src",
  "database.types.ts",
);
const supabaseCli = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
const cleanEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key !== "CLAUDECODE"),
);

const result = spawnSync(
  process.execPath,
  [supabaseCli, "gen", "types", "typescript", "--local", "--schema", "public", "--agent", "no"],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: cleanEnvironment,
    maxBuffer: 10 * 1024 * 1024,
  },
);

if (result.error) {
  console.error(`No fue posible ejecutar la CLI local de Supabase: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  console.error("No fue posible generar los tipos desde Supabase local.");
  process.exit(result.status ?? 1);
}

const rawGeneratedTypes = result.stdout.replaceAll("\r\n", "\n").trimEnd().concat("\n");

if (!rawGeneratedTypes.includes("export type Database =")) {
  console.error("La CLI no produjo un contrato TypeScript Database reconocible.");
  process.exit(1);
}

const prettierConfig = await resolveConfig(generatedFile);
const generatedTypes = await format(rawGeneratedTypes, {
  ...prettierConfig,
  filepath: generatedFile,
});

if (mode === "write") {
  await writeFile(generatedFile, generatedTypes, "utf8");
  console.log(
    `Tipos de base de datos actualizados: ${path.relative(repositoryRoot, generatedFile)}`,
  );
  process.exit(0);
}

let versionedTypes;

try {
  versionedTypes = await readFile(generatedFile, "utf8");
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    console.error("Falta el contrato generado. Ejecuta `pnpm db:types` y versiona el resultado.");
    process.exit(1);
  }

  throw error;
}

if (versionedTypes.replaceAll("\r\n", "\n") !== generatedTypes) {
  console.error(
    "El contrato de base de datos no coincide con Supabase local. Ejecuta `pnpm db:types` y revisa el cambio.",
  );
  process.exit(1);
}

console.log("El contrato de base de datos coincide con Supabase local.");
