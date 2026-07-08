import { describe, expect, it } from 'vitest';
import {
  combinePolicyEvaluationDecisions,
  createTenantScope,
  createTenantScopedActionAccessEvaluator,
  createTenantScopedActionAccessPolicy,
  createTenantScopedComponentAccessEvaluator,
  createTenantScopedComponentAccessPolicy,
  createTenantScopedFieldAccessPolicy,
  evaluateTenantScope,
  evaluateTenantScopedActionAccess,
  evaluateTenantScopedComponentAccess,
  evaluateTenantScopedFieldAccess,
  fieldEquals,
  type ComponentAccessPrincipal,
} from '../src/index';

type InvoiceRecord = {
  region: 'us' | 'eu';
  status: 'draft' | 'final';
  amount: number;
};

describe('tenantPolicyEvaluation', () => {
  const principal: ComponentAccessPrincipal = {
    userId: 'u1',
    roles: ['admin'],
    permissions: ['billing:read', 'billing:write'],
    tenantId: 'tenant-a',
  };

  it('creates and evaluates tenant scopes', () => {
    const scope = createTenantScope({
      allowedTenants: ['tenant-a', 'tenant-a', 'tenant-b', ' '],
    });

    expect(scope.allowedTenants).toEqual(['tenant-a', 'tenant-b']);
    expect(scope.denyWhenTenantMissing).toBe(true);

    expect(evaluateTenantScope(scope, 'tenant-a').allowed).toBe(true);
    const mismatch = evaluateTenantScope(scope, 'tenant-c');
    expect(mismatch.allowed).toBe(false);
    expect(mismatch.reasons.map((reason) => reason.code)).toEqual(['tenant-mismatch']);
  });

  it('supports missing-tenant override on scope evaluation', () => {
    const scope = createTenantScope({
      allowedTenants: ['tenant-a'],
      denyWhenTenantMissing: false,
    });

    const result = evaluateTenantScope(scope);
    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('denies missing tenant when scope requires tenant context', () => {
    const scope = createTenantScope({
      allowedTenants: ['tenant-a'],
      denyWhenTenantMissing: true,
    });

    const result = evaluateTenantScope(scope, '   ');
    expect(result.allowed).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual(['tenant-missing']);
  });

  it('evaluates tenant scoped component policy by combining auth and tenant decisions', () => {
    const policy = createTenantScopedComponentAccessPolicy({
      componentKey: 'billing-panel',
      requiredPermissions: ['billing:read'],
      allowedTenants: ['tenant-a'],
    });

    const allowed = evaluateTenantScopedComponentAccess(policy, principal);
    expect(allowed.allowed).toBe(true);

    const tenantDenied = evaluateTenantScopedComponentAccess(policy, {
      ...principal,
      tenantId: 'tenant-b',
    });
    expect(tenantDenied.allowed).toBe(false);
    expect(tenantDenied.reasons.map((reason) => reason.code)).toContain('tenant-mismatch');

    const authDenied = evaluateTenantScopedComponentAccess(policy, {
      ...principal,
      permissions: [],
    });
    expect(authDenied.allowed).toBe(false);
    expect(authDenied.reasons.map((reason) => reason.code)).toContain('missing-permissions');
  });

  it('evaluates tenant scoped action policy and preserves base failure reasons', () => {
    const policy = createTenantScopedActionAccessPolicy({
      componentKey: 'billing-panel',
      actionKey: 'refund',
      requiredPermissions: ['billing:refund'],
      allowedTenants: ['tenant-a'],
    });

    const result = evaluateTenantScopedActionAccess(policy, principal);
    expect(result.allowed).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toContain('missing-permissions');
  });

  it('evaluates tenant scoped field policy with tenant and condition constraints', () => {
    const policy = createTenantScopedFieldAccessPolicy<InvoiceRecord, 'amount'>({
      fieldKey: 'amount',
      mode: 'write',
      requiredPermissions: ['billing:write'],
      conditions: [fieldEquals<InvoiceRecord, 'status'>('status', 'draft')],
      allowedTenants: ['tenant-a'],
    });

    const allowed = evaluateTenantScopedFieldAccess(policy, {
      principal,
      record: {
        region: 'us',
        status: 'draft',
        amount: 100,
      },
    });

    expect(allowed.allowed).toBe(true);

    const deniedByCondition = evaluateTenantScopedFieldAccess(policy, {
      principal,
      record: {
        region: 'us',
        status: 'final',
        amount: 100,
      },
    });
    expect(deniedByCondition.allowed).toBe(false);
    expect(deniedByCondition.reasons.map((reason) => reason.code)).toContain('conditions-not-met');

    const deniedByTenant = evaluateTenantScopedFieldAccess(policy, {
      principal: {
        ...principal,
        tenantId: 'tenant-b',
      },
      record: {
        region: 'us',
        status: 'draft',
        amount: 100,
      },
    });
    expect(deniedByTenant.allowed).toBe(false);
    expect(deniedByTenant.reasons.map((reason) => reason.code)).toContain('tenant-mismatch');
  });

  it('evaluates registered tenant scoped component policies through evaluator helper', () => {
    const evaluator = createTenantScopedComponentAccessEvaluator([
      createTenantScopedComponentAccessPolicy({
        componentKey: 'billing-panel',
        requiredPermissions: ['billing:read'],
        allowedTenants: ['tenant-a'],
      }),
    ]);

    expect(evaluator.hasComponent('billing-panel')).toBe(true);
    expect(evaluator.listComponentKeys()).toEqual(['billing-panel']);

    const missing = evaluator.evaluate('missing', principal);
    expect(missing.allowed).toBe(false);
    expect(missing.reasons.map((reason) => reason.code)).toEqual(['component-not-registered']);

    const tenantMissing = evaluator.evaluate('missing', {
      ...principal,
      tenantId: 'tenant-z',
    });
    expect(tenantMissing.tenantScope.tenantId).toBe('tenant-z');
  });

  it('evaluates registered tenant scoped action policies through evaluator helper', () => {
    const evaluator = createTenantScopedActionAccessEvaluator([
      createTenantScopedActionAccessPolicy({
        componentKey: 'billing-panel',
        actionKey: 'refund',
        requiredPermissions: ['billing:write'],
        allowedTenants: ['tenant-a'],
      }),
      createTenantScopedActionAccessPolicy({
        componentKey: 'billing-panel',
        actionKey: 'archive',
        allowedTenants: ['tenant-a'],
      }),
    ]);

    expect(evaluator.hasAction('billing-panel', 'refund')).toBe(true);
    expect(evaluator.hasAction('billing-panel', 'missing')).toBe(false);
    expect(evaluator.listActions('billing-panel')).toEqual(['archive', 'refund']);
    expect(evaluator.listActions()).toEqual(['archive', 'refund']);

    const allowed = evaluator.evaluate('billing-panel', 'refund', principal);
    expect(allowed.allowed).toBe(true);

    const missing = evaluator.evaluate('billing-panel', 'missing', principal);
    expect(missing.allowed).toBe(false);
    expect(missing.reasons.map((reason) => reason.code)).toEqual(['action-not-registered']);

    expect(evaluator.listActions('missing-component')).toEqual([]);
  });

  it('normalizes allowed tenant lists in scoped policy factories', () => {
    const componentPolicy = createTenantScopedComponentAccessPolicy({
      componentKey: 'billing-panel',
      allowedTenants: ['tenant-a', 'tenant-a', ' ', 'tenant-b'],
    });

    const actionPolicy = createTenantScopedActionAccessPolicy({
      componentKey: 'billing-panel',
      actionKey: 'archive',
      allowedTenants: ['tenant-a', 'tenant-a', 'tenant-c'],
    });

    const fieldPolicy = createTenantScopedFieldAccessPolicy<InvoiceRecord, 'amount'>({
      fieldKey: 'amount',
      allowedTenants: ['tenant-b', 'tenant-b', 'tenant-d'],
    });

    expect(componentPolicy.tenantScope.allowedTenants).toEqual(['tenant-a', 'tenant-b']);
    expect(actionPolicy.tenantScope.allowedTenants).toEqual(['tenant-a', 'tenant-c']);
    expect(fieldPolicy.tenantScope.allowedTenants).toEqual(['tenant-b', 'tenant-d']);
  });

  it('throws for empty component or action keys in tenant evaluators', () => {
    const componentEvaluator = createTenantScopedComponentAccessEvaluator([]);
    expect(() => componentEvaluator.evaluate('   ', principal)).toThrow('Component policy key must be non-empty.');

    const actionEvaluator = createTenantScopedActionAccessEvaluator([]);
    expect(() => actionEvaluator.evaluate('billing-panel', '   ', principal)).toThrow(
      'Action policy key must be non-empty.'
    );
  });

  it('combines policy decisions into a single allow or deny output', () => {
    const allowDecision = combinePolicyEvaluationDecisions([
      {
        allowed: true,
        reasons: [],
      },
      {
        allowed: true,
        reasons: [],
      },
    ]);

    expect(allowDecision.allowed).toBe(true);
    expect(allowDecision.decision).toBe('allow');

    const denyDecision = combinePolicyEvaluationDecisions([
      {
        allowed: true,
        reasons: [],
      },
      {
        allowed: false,
        reasons: [
          {
            code: 'tenant-mismatch',
            message: 'Tenant mismatch.',
          },
        ],
      },
    ]);

    expect(denyDecision.allowed).toBe(false);
    expect(denyDecision.decision).toBe('deny');
    expect(denyDecision.reasons.map((reason) => reason.code)).toEqual(['tenant-mismatch']);
  });
});
