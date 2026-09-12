import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("@bbqbros/domain package boundary", () => {
  it("remains a private ESM package without runtime dependencies", async () => {
    const contents = await readFile(new URL("../package.json", import.meta.url), "utf8");
    const manifest = JSON.parse(contents) as unknown;

    expect(manifest).toMatchObject({
      name: "@bbqbros/domain",
      private: true,
      type: "module",
    });
    expect(manifest).not.toHaveProperty("dependencies");
  });
});
