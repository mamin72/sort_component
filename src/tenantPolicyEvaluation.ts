import {
  createActionAccessPolicy,
  createComponentAccessPolicy,
  evaluateActionAccess,
  evaluateComponentAccess,
  type ActionAccessPolicy,
  type ActionAccessResult,
  type ComponentAccessPolicy,
  type ComponentAccessPrincipal,
  type ComponentAccessResult,
} from './componentAccessContracts';
import {
  createFieldAccessPolicy,
  evaluateFieldAccess,
  type FieldAccessContext,
  type FieldAccessPolicy,
  type FieldAccessResult,
  type FieldKeyOf,
} from './fieldAccessGuards';

export type TenantScopeReasonCode = 'tenant-missing' | 'tenant-mismatch';

export interface TenantScopeReason {
  code: TenantScopeReasonCode;
  message: string;
}

export interface TenantScope {
  allowedTenants: readonly string[];
  denyWhenTenantMissing: boolean;
}

export interface TenantScopeResult {
  allowed: boolean;
  decision: 'allow' | 'deny';
  tenantId?: string;
  reasons: readonly TenantScopeReason[];
}

export interface TenantScopedComponentAccessPolicy extends ComponentAccessPolicy {
  tenantScope: TenantScope;
}

export interface TenantScopedActionAccessPolicy extends ActionAccessPolicy {
  tenantScope: TenantScope;
}

export interface TenantScopedFieldAccessPolicy<
  TRecord extends Record<string, unknown>,
  TField extends FieldKeyOf<TRecord> = FieldKeyOf<TRecord>
> extends FieldAccessPolicy<TRecord, TField> {
  tenantScope: TenantScope;
}

export interface TenantScopedComponentAccessResult extends Omit<ComponentAccessResult, 'reasons'> {
  reasons: readonly (ComponentAccessResult['reasons'][number] | TenantScopeReason)[];
  tenantScope: TenantScopeResult;
}

export interface TenantScopedActionAccessResult extends Omit<ActionAccessResult, 'reasons'> {
  reasons: readonly (ActionAccessResult['reasons'][number] | TenantScopeReason)[];
  tenantScope: TenantScopeResult;
}

export interface TenantScopedFieldAccessResult<TRecord extends Record<string, unknown>>
  extends Omit<FieldAccessResult<TRecord>, 'reasons'> {
  reasons: readonly (FieldAccessResult<TRecord>['reasons'][number] | TenantScopeReason)[];
  tenantScope: TenantScopeResult;
}

export interface PolicyEvaluationReason {
  code: string;
  message: string;
}

export interface PolicyEvaluationDecision {
  allowed: boolean;
  decision: 'allow' | 'deny';
  reasons: readonly PolicyEvaluationReason[];
}

export function createTenantScope(input: {
  allowedTenants?: readonly string[];
  denyWhenTenantMissing?: boolean;
} = {}): TenantScope {
  return {
    allowedTenants: normalizeList(input.allowedTenants),
    denyWhenTenantMissing: input.denyWhenTenantMissing ?? true,
  };
}

export function evaluateTenantScope(scope: TenantScope, tenantId?: string): TenantScopeResult {
  const reasons: TenantScopeReason[] = [];

  const normalizedTenantId = tenantId?.trim();
  if (!normalizedTenantId) {
    if (scope.denyWhenTenantMissing) {
      reasons.push({
        code: 'tenant-missing',
        message: 'Tenant id is required by this policy scope.',
      });
    }

    return toTenantScopeResult(normalizedTenantId, reasons);
  }

  if (scope.allowedTenants.length > 0 && !scope.allowedTenants.includes(normalizedTenantId)) {
    reasons.push({
      code: 'tenant-mismatch',
      message: `Tenant '${normalizedTenantId}' is not allowed by this policy scope.`,
    });
  }

  return toTenantScopeResult(normalizedTenantId, reasons);
}

export function createTenantScopedComponentAccessPolicy(input: {
  componentKey: string;
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  requireAllPermissions?: boolean;
  denyWhenUnauthenticated?: boolean;
  allowedTenants?: readonly string[];
  denyWhenTenantMissing?: boolean;
}): TenantScopedComponentAccessPolicy {
  const policy = createComponentAccessPolicy(input);

  return {
    ...policy,
    tenantScope: createTenantScope({
      allowedTenants: input.allowedTenants,
      denyWhenTenantMissing: input.denyWhenTenantMissing,
    }),
  };
}

export function createTenantScopedActionAccessPolicy(input: {
  componentKey: string;
  actionKey: string;
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  requireAllPermissions?: boolean;
  denyWhenUnauthenticated?: boolean;
  allowedTenants?: readonly string[];
  denyWhenTenantMissing?: boolean;
}): TenantScopedActionAccessPolicy {
  const policy = createActionAccessPolicy(input);

  return {
    ...policy,
    tenantScope: createTenantScope({
      allowedTenants: input.allowedTenants,
      denyWhenTenantMissing: input.denyWhenTenantMissing,
    }),
  };
}

export function createTenantScopedFieldAccessPolicy<
  TRecord extends Record<string, unknown>,
  TField extends FieldKeyOf<TRecord>
>(input: {
  fieldKey: TField;
  mode?: 'read' | 'write';
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  requireAllPermissions?: boolean;
  denyWhenUnauthenticated?: boolean;
  conditions?: FieldAccessPolicy<TRecord, TField>['conditions'];
  allowedTenants?: readonly string[];
  denyWhenTenantMissing?: boolean;
}): TenantScopedFieldAccessPolicy<TRecord, TField> {
  const policy = createFieldAccessPolicy<TRecord, TField>(input);

  return {
    ...policy,
    tenantScope: createTenantScope({
      allowedTenants: input.allowedTenants,
      denyWhenTenantMissing: input.denyWhenTenantMissing,
    }),
  };
}

export function evaluateTenantScopedComponentAccess(
  policy: TenantScopedComponentAccessPolicy,
  principal?: ComponentAccessPrincipal
): TenantScopedComponentAccessResult {
  const baseResult = evaluateComponentAccess(policy, principal);
  const scopeResult = evaluateTenantScope(policy.tenantScope, principal?.tenantId);

  return {
    ...baseResult,
    allowed: baseResult.allowed && scopeResult.allowed,
    decision: baseResult.allowed && scopeResult.allowed ? 'allow' : 'deny',
    reasons: mergeReasons(baseResult.reasons, scopeResult.reasons),
    tenantScope: scopeResult,
  };
}

export function evaluateTenantScopedActionAccess(
  policy: TenantScopedActionAccessPolicy,
  principal?: ComponentAccessPrincipal
): TenantScopedActionAccessResult {
  const baseResult = evaluateActionAccess(policy, principal);
  const scopeResult = evaluateTenantScope(policy.tenantScope, principal?.tenantId);

  return {
    ...baseResult,
    allowed: baseResult.allowed && scopeResult.allowed,
    decision: baseResult.allowed && scopeResult.allowed ? 'allow' : 'deny',
    reasons: mergeReasons(baseResult.reasons, scopeResult.reasons),
    tenantScope: scopeResult,
  };
}

export function evaluateTenantScopedFieldAccess<TRecord extends Record<string, unknown>>(
  policy: TenantScopedFieldAccessPolicy<TRecord>,
  context: FieldAccessContext<TRecord> = {}
): TenantScopedFieldAccessResult<TRecord> {
  const baseResult = evaluateFieldAccess(policy, context);
  const scopeResult = evaluateTenantScope(policy.tenantScope, context.principal?.tenantId);

  return {
    ...baseResult,
    allowed: baseResult.allowed && scopeResult.allowed,
    decision: baseResult.allowed && scopeResult.allowed ? 'allow' : 'deny',
    reasons: mergeReasons(baseResult.reasons, scopeResult.reasons),
    tenantScope: scopeResult,
  };
}

export function createTenantScopedComponentAccessEvaluator(policies: readonly TenantScopedComponentAccessPolicy[]): {
  evaluate(componentKey: string, principal?: ComponentAccessPrincipal): TenantScopedComponentAccessResult;
  hasComponent(componentKey: string): boolean;
  listComponentKeys(): readonly string[];
} {
  const entries = new Map<string, TenantScopedComponentAccessPolicy>();

  for (const policy of policies) {
    entries.set(policy.componentKey, policy);
  }

  return {
    evaluate(componentKey: string, principal?: ComponentAccessPrincipal): TenantScopedComponentAccessResult {
      const normalizedKey = normalizeKey(componentKey, 'Component policy key must be non-empty.');
      const policy = entries.get(normalizedKey);

      if (!policy) {
        return {
          scope: 'component',
          componentKey: normalizedKey,
          allowed: false,
          decision: 'deny',
          missingRoles: [],
          missingPermissions: [],
          reasons: [
            {
              code: 'component-not-registered',
              message: `No component access policy is registered for '${normalizedKey}'.`,
            },
          ],
          tenantScope: toTenantScopeResult(principal?.tenantId, []),
        };
      }

      return evaluateTenantScopedComponentAccess(policy, principal);
    },
    hasComponent(componentKey: string): boolean {
      return entries.has(componentKey.trim());
    },
    listComponentKeys(): readonly string[] {
      return Array.from(entries.keys()).sort((left, right) => left.localeCompare(right));
    },
  };
}

export function createTenantScopedActionAccessEvaluator(policies: readonly TenantScopedActionAccessPolicy[]): {
  evaluate(componentKey: string, actionKey: string, principal?: ComponentAccessPrincipal): TenantScopedActionAccessResult;
  hasAction(componentKey: string, actionKey: string): boolean;
  listActions(componentKey?: string): readonly string[];
} {
  const entries = new Map<string, Map<string, TenantScopedActionAccessPolicy>>();

  for (const policy of policies) {
    const componentActions = entries.get(policy.componentKey) ?? new Map<string, TenantScopedActionAccessPolicy>();
    componentActions.set(policy.actionKey, policy);
    entries.set(policy.componentKey, componentActions);
  }

  return {
    evaluate(componentKey: string, actionKey: string, principal?: ComponentAccessPrincipal): TenantScopedActionAccessResult {
      const normalizedComponentKey = normalizeKey(componentKey, 'Component policy key must be non-empty.');
      const normalizedActionKey = normalizeKey(actionKey, 'Action policy key must be non-empty.');
      const componentActions = entries.get(normalizedComponentKey);
      const policy = componentActions?.get(normalizedActionKey);

      if (!policy) {
        return {
          scope: 'action',
          componentKey: normalizedComponentKey,
          actionKey: normalizedActionKey,
          allowed: false,
          decision: 'deny',
          missingRoles: [],
          missingPermissions: [],
          reasons: [
            {
              code: 'action-not-registered',
              message: `No action access policy is registered for '${normalizedComponentKey}:${normalizedActionKey}'.`,
            },
          ],
          tenantScope: toTenantScopeResult(principal?.tenantId, []),
        };
      }

      return evaluateTenantScopedActionAccess(policy, principal);
    },
    hasAction(componentKey: string, actionKey: string): boolean {
      const componentActions = entries.get(componentKey.trim());
      return componentActions?.has(actionKey.trim()) ?? false;
    },
    listActions(componentKey?: string): readonly string[] {
      if (componentKey == null) {
        const actionKeys = Array.from(entries.values()).flatMap((actions) => Array.from(actions.keys()));
        return Array.from(new Set(actionKeys)).sort((left, right) => left.localeCompare(right));
      }

      const componentActions = entries.get(componentKey.trim());
      if (!componentActions) {
        return [];
      }

      return Array.from(componentActions.keys()).sort((left, right) => left.localeCompare(right));
    },
  };
}

export function combinePolicyEvaluationDecisions(
  results: readonly {
    allowed: boolean;
    reasons: readonly PolicyEvaluationReason[];
  }[]
): PolicyEvaluationDecision {
  const reasons = results.flatMap((result) => result.reasons);
  const allowed = results.every((result) => result.allowed);

  return {
    allowed,
    decision: allowed ? 'allow' : 'deny',
    reasons,
  };
}

function normalizeList(values?: readonly string[]): readonly string[] {
  if (!values) {
    return [];
  }

  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

function toTenantScopeResult(tenantId: string | undefined, reasons: readonly TenantScopeReason[]): TenantScopeResult {
  const allowed = reasons.length === 0;

  return {
    allowed,
    decision: allowed ? 'allow' : 'deny',
    tenantId,
    reasons,
  };
}

function normalizeKey(value: string, message: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(message);
  }

  return normalized;
}

function mergeReasons<TBaseReason extends PolicyEvaluationReason>(
  baseReasons: readonly TBaseReason[],
  scopeReasons: readonly TenantScopeReason[]
): readonly (TBaseReason | TenantScopeReason)[] {
  return [...baseReasons, ...scopeReasons];
}
