import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const forbiddenPaths = [
  ".claude",
  ".opencode",
  ".gemini",
  "CLAUDE.md",
  "GEMINI.md",
  "opencode.json",
];

const violations = forbiddenPaths.filter((path) => existsSync(path));
const instructionFiles = execFileSync("git", ["ls-files", "*AGENTS.md", "*AGENTS.override.md"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

if (instructionFiles.length !== 1 || instructionFiles[0] !== "AGENTS.md") {
  violations.push(
    `se esperaba un único archivo de instrucciones AGENTS.md; encontrados: ${instructionFiles.join(", ") || "ninguno"}`,
  );
}

if (violations.length > 0) {
  console.error("Gobierno de agentes inválido:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Gobierno de agentes válido: Codex usa un único AGENTS.md raíz.");
