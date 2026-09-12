import { DOMAIN_ERROR_CODES, createDomainError, type DomainError } from "../shared/domain-error.js";
import { type BrandId, type ModifierGroupId, type ModifierOptionId } from "../shared/identifier.js";
import { failure, success, type Result } from "../shared/result.js";
import { type ModifierGroup } from "./model.js";
import { type ValidatedModifierSelection } from "./modifier-selection.js";

export type ModifierCondition = Readonly<{
  brandId: BrandId;
  parentGroupId: ModifierGroupId;
  activatingOptionId: ModifierOptionId;
  childGroupId: ModifierGroupId;
}>;

export type ModifierConditionGraph = Readonly<{
  brandId: BrandId;
  conditions: readonly ModifierCondition[];
}>;

type DependencyDetails = Readonly<{
  reason: string;
  conditionIndex?: number;
  groupId?: ModifierGroupId;
  optionId?: ModifierOptionId;
}>;

function invalidDependency(details: DependencyDetails): Result<never, DomainError> {
  return failure(
    createDomainError(DOMAIN_ERROR_CODES.invalidModifierDependency, {
      path: "conditions",
      details,
    }),
  );
}

function containsCycle(
  groupIds: readonly ModifierGroupId[],
  conditions: readonly ModifierCondition[],
): boolean {
  const edges = new Map<ModifierGroupId, ModifierGroupId[]>();

  for (const groupId of groupIds) {
    edges.set(groupId, []);
  }

  for (const condition of conditions) {
    edges.get(condition.parentGroupId)?.push(condition.childGroupId);
  }

  const visiting = new Set<ModifierGroupId>();
  const visited = new Set<ModifierGroupId>();

  function visit(groupId: ModifierGroupId): boolean {
    if (visiting.has(groupId)) {
      return true;
    }

    if (visited.has(groupId)) {
      return false;
    }

    visiting.add(groupId);

    for (const childGroupId of edges.get(groupId) ?? []) {
      if (visit(childGroupId)) {
        return true;
      }
    }

    visiting.delete(groupId);
    visited.add(groupId);
    return false;
  }

  return groupIds.some((groupId) => visit(groupId));
}

export function validateModifierConditions(
  input: Readonly<{
    brandId: BrandId;
    groups: readonly ModifierGroup[];
    conditions: readonly ModifierCondition[];
  }>,
): Result<ModifierConditionGraph, DomainError> {
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
      return invalidDependency({ reason: "duplicate_group_reference", groupId: group.id });
    }

    groupById.set(group.id, group);
  }

  const conditionKeys = new Set<string>();

  for (const [conditionIndex, condition] of input.conditions.entries()) {
    if (condition.brandId !== input.brandId) {
      return failure(
        createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
          path: "conditions",
          details: { conditionIndex },
        }),
      );
    }

    const parentGroup = groupById.get(condition.parentGroupId);

    if (parentGroup === undefined) {
      return invalidDependency({
        reason: "parent_group_not_found",
        conditionIndex,
        groupId: condition.parentGroupId,
      });
    }

    if (!groupById.has(condition.childGroupId)) {
      return invalidDependency({
        reason: "child_group_not_found",
        conditionIndex,
        groupId: condition.childGroupId,
      });
    }

    if (condition.parentGroupId === condition.childGroupId) {
      return invalidDependency({
        reason: "self_reference",
        conditionIndex,
        groupId: condition.parentGroupId,
      });
    }

    if (!parentGroup.options.some((option) => option.id === condition.activatingOptionId)) {
      return invalidDependency({
        reason: "activating_option_not_found_in_parent",
        conditionIndex,
        groupId: condition.parentGroupId,
        optionId: condition.activatingOptionId,
      });
    }

    const conditionKey = [
      condition.parentGroupId,
      condition.activatingOptionId,
      condition.childGroupId,
    ].join(":");

    if (conditionKeys.has(conditionKey)) {
      return invalidDependency({ reason: "duplicate_condition", conditionIndex });
    }

    conditionKeys.add(conditionKey);
  }

  if (containsCycle([...groupById.keys()], input.conditions)) {
    return invalidDependency({ reason: "cycle" });
  }

  return success(
    Object.freeze({
      brandId: input.brandId,
      conditions: Object.freeze(
        input.conditions.map((condition) => Object.freeze({ ...condition })),
      ),
    }),
  );
}

export function getActiveModifierGroups(
  input: Readonly<{
    brandId: BrandId;
    groups: readonly ModifierGroup[];
    conditionGraph: ModifierConditionGraph;
    selections: readonly ValidatedModifierSelection[];
  }>,
): Result<readonly ModifierGroup[], DomainError> {
  if (input.conditionGraph.brandId !== input.brandId) {
    return failure(
      createDomainError(DOMAIN_ERROR_CODES.modifierBrandMismatch, {
        path: "conditionGraph",
      }),
    );
  }

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

    groupById.set(group.id, group);
  }

  const selectedOptionIdsByGroup = new Map<ModifierGroupId, Set<ModifierOptionId>>();

  for (const selection of input.selections) {
    selectedOptionIdsByGroup.set(
      selection.groupId,
      new Set(selection.options.map((option) => option.id)),
    );
  }

  const conditionalGroupIds = new Set(
    input.conditionGraph.conditions.map((condition) => condition.childGroupId),
  );
  const activeGroupIds = new Set(
    input.groups
      .filter((group) => group.isActive && !conditionalGroupIds.has(group.id))
      .map((group) => group.id),
  );

  let activatedGroup = true;

  while (activatedGroup) {
    activatedGroup = false;

    for (const condition of input.conditionGraph.conditions) {
      const childGroup = groupById.get(condition.childGroupId);
      const activatingOptions = selectedOptionIdsByGroup.get(condition.parentGroupId);

      if (
        childGroup?.isActive === true &&
        activeGroupIds.has(condition.parentGroupId) &&
        activatingOptions?.has(condition.activatingOptionId) === true &&
        !activeGroupIds.has(condition.childGroupId)
      ) {
        activeGroupIds.add(condition.childGroupId);
        activatedGroup = true;
      }
    }
  }

  return success(Object.freeze(input.groups.filter((group) => activeGroupIds.has(group.id))));
}
