import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{35}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["OpenAI or provider key", /\bsk-[A-Za-z0-9_-]{32,}\b/],
  ["Stripe secret", /\b(?:sk_live_|rk_live_|whsec_)[A-Za-z0-9]{20,}\b/],
];

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const file of trackedFiles) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (content.includes("\0")) {
    continue;
  }

  for (const [name, pattern] of patterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: posible ${name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Se detectaron patrones que requieren revisión:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No se detectaron patrones de secretos de alta confianza en archivos versionados.");
