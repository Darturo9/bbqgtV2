import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import { failure, success, type Result } from "../shared/result.js";

export const MAX_SPECIAL_INSTRUCTIONS_LENGTH = 200;

declare const specialInstructionsBrand: unique symbol;

export type SpecialInstructions = string & {
  readonly [specialInstructionsBrand]: true;
};

function countCharacters(value: string): number {
  return Array.from(new Intl.Segmenter("es", { granularity: "grapheme" }).segment(value)).length;
}

export function normalizeSpecialInstructions(
  value: string | undefined,
): Result<SpecialInstructions | undefined, DomainError> {
  const normalized = value?.trim().replace(/\s+/gu, " ");

  if (normalized === undefined || normalized.length === 0) {
    return success(undefined);
  }

  const characterCount = countCharacters(normalized);

  if (characterCount > MAX_SPECIAL_INSTRUCTIONS_LENGTH) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.specialInstructionsTooLong, {
        path: "instructions",
        details: {
          actual: characterCount,
          maximum: MAX_SPECIAL_INSTRUCTIONS_LENGTH,
        },
      }),
    );
  }

  return success(normalized as SpecialInstructions);
}
