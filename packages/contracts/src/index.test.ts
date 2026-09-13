import { describe, expectTypeOf, it } from "vitest";

import type { Database } from "./index.js";

describe("public package entry", () => {
  it("exports the generated Database contract", () => {
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("brands");
  });
});
