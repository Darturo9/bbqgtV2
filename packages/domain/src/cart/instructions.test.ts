import { describe, expect, it } from "vitest";

import { MAX_SPECIAL_INSTRUCTIONS_LENGTH, normalizeSpecialInstructions } from "./instructions.js";

describe("special instructions", () => {
  it.each([undefined, "", "   \n\t  "])("normalizes %s as absent", (value) => {
    expect(normalizeSpecialInstructions(value)).toEqual({ ok: true, value: undefined });
  });

  it("trims and collapses internal whitespace", () => {
    expect(normalizeSpecialInstructions("  Sin   cebolla\n y\tcon salsa aparte  ")).toEqual({
      ok: true,
      value: "Sin cebolla y con salsa aparte",
    });
  });

  it("accepts exactly 200 visible characters", () => {
    const value = "a".repeat(MAX_SPECIAL_INSTRUCTIONS_LENGTH);

    expect(normalizeSpecialInstructions(value)).toEqual({ ok: true, value });
  });

  it("rejects more than 200 visible characters", () => {
    expect(
      normalizeSpecialInstructions("a".repeat(MAX_SPECIAL_INSTRUCTIONS_LENGTH + 1)),
    ).toMatchObject({
      ok: false,
      error: {
        code: "SPECIAL_INSTRUCTIONS_TOO_LONG",
        details: { actual: 201, maximum: MAX_SPECIAL_INSTRUCTIONS_LENGTH },
      },
    });
  });

  it("counts a composed emoji as one visible character", () => {
    const familyEmoji = "👨‍👩‍👧‍👦";

    expect(
      normalizeSpecialInstructions(familyEmoji.repeat(MAX_SPECIAL_INSTRUCTIONS_LENGTH)),
    ).toMatchObject({ ok: true });
    expect(
      normalizeSpecialInstructions(familyEmoji.repeat(MAX_SPECIAL_INSTRUCTIONS_LENGTH + 1)),
    ).toMatchObject({
      ok: false,
      error: { code: "SPECIAL_INSTRUCTIONS_TOO_LONG", details: { actual: 201 } },
    });
  });
});
