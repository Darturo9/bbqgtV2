import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import {
  type BrandId,
  type CategoryId,
  type ModifierGroupId,
  type ProductId,
} from "../shared/identifier.js";
import { failure, success, type Result } from "../shared/result.js";
import { type ModifierGroup } from "./model.js";

export type CategoryModifierAssignment = Readonly<{
  brandId: BrandId;
  categoryId: CategoryId;
  groupId: ModifierGroupId;
  excludedProductIds: readonly ProductId[];
}>;

export type ProductModifierAssignment = Readonly<{
  brandId: BrandId;
  productId: ProductId;
  groupId: ModifierGroupId;
}>;

export type ResolvedModifierGroup = Readonly<{
  group: ModifierGroup;
  source: "category" | "product";
}>;

function invalidAssignment(reason: string, assignmentIndex?: number): Result<never, DomainError> {
  return failure(
    createDomainError(DOMAIN_ERROR_CODES.invalidModifierAssignment, {
      path: "assignments",
      details: {
        reason,
        ...(assignmentIndex === undefined ? {} : { assignmentIndex }),
      },
    }),
  );
}

export function resolveModifierGroupsForProduct(
  input: Readonly<{
    brandId: BrandId;
    categoryId: CategoryId;
    productId: ProductId;
    groups: readonly ModifierGroup[];
    categoryAssignments: readonly CategoryModifierAssignment[];
    productAssignments: readonly ProductModifierAssignment[];
  }>,
): Result<readonly ResolvedModifierGroup[], DomainError> {
  const groupById = new Map<ModifierGroupId, ModifierGroup>();

  for (const group of input.groups) {
    if (group.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
          path: "groups",
          details: { groupId: group.id },
        }),
      );
    }

    if (groupById.has(group.id)) {
      return invalidAssignment("duplicate_group_reference");
    }

    groupById.set(group.id, group);
  }

  const resolved: ResolvedModifierGroup[] = [];
  const effectiveGroupIds = new Set<ModifierGroupId>();

  function appendGroup(
    groupId: ModifierGroupId,
    source: ResolvedModifierGroup["source"],
    assignmentIndex: number,
  ): Result<undefined, DomainError> {
    const group = groupById.get(groupId);

    if (group === undefined) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierGroupNotFound, {
          path: "assignments",
          details: { assignmentIndex, groupId },
        }),
      );
    }

    if (effectiveGroupIds.has(groupId)) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.duplicateEffectiveModifierGroup, {
          path: "assignments",
          details: { assignmentIndex, groupId },
        }),
      );
    }

    effectiveGroupIds.add(groupId);
    resolved.push(Object.freeze({ group, source }));
    return success(undefined);
  }

  for (const [assignmentIndex, assignment] of input.categoryAssignments.entries()) {
    if (assignment.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
          path: "categoryAssignments",
          details: { assignmentIndex },
        }),
      );
    }

    if (new Set(assignment.excludedProductIds).size !== assignment.excludedProductIds.length) {
      return invalidAssignment("duplicate_product_exclusion", assignmentIndex);
    }

    if (!groupById.has(assignment.groupId)) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierGroupNotFound, {
          path: "categoryAssignments",
          details: { assignmentIndex, groupId: assignment.groupId },
        }),
      );
    }

    if (
      assignment.categoryId !== input.categoryId ||
      assignment.excludedProductIds.includes(input.productId)
    ) {
      continue;
    }

    const result = appendGroup(assignment.groupId, "category", assignmentIndex);

    if (!result.ok) {
      return result;
    }
  }

  for (const [assignmentIndex, assignment] of input.productAssignments.entries()) {
    if (assignment.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
          path: "productAssignments",
          details: { assignmentIndex },
        }),
      );
    }

    if (!groupById.has(assignment.groupId)) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierGroupNotFound, {
          path: "productAssignments",
          details: { assignmentIndex, groupId: assignment.groupId },
        }),
      );
    }

    if (assignment.productId !== input.productId) {
      continue;
    }

    const result = appendGroup(assignment.groupId, "product", assignmentIndex);

    if (!result.ok) {
      return result;
    }
  }

  return success(Object.freeze(resolved));
}
