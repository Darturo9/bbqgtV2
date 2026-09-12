export const DOMAIN_ERROR_CODES = {
  invalidIdentifier: "INVALID_IDENTIFIER",
} as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[keyof typeof DOMAIN_ERROR_CODES];

export type DomainErrorDetail = string | number | boolean;

export type DomainError = Readonly<{
  code: DomainErrorCode;
  path?: string;
  details?: Readonly<Record<string, DomainErrorDetail>>;
}>;

type DomainErrorContext = Readonly<{
  path?: string;
  details?: Readonly<Record<string, DomainErrorDetail>>;
}>;

export function createDomainError(
  code: DomainErrorCode,
  context: DomainErrorContext = {},
): DomainError {
  return {
    code,
    ...(context.path === undefined ? {} : { path: context.path }),
    ...(context.details === undefined ? {} : { details: context.details }),
  };
}
