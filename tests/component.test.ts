import { describe, expect, it } from 'vitest';
import { component, sortUsingComponent } from '../src/index';

describe('component namespace', () => {
  it('provides auth and billing kit capabilities', () => {
    const auth = component.authKit.createContext({
      tenantId: 't1',
      userId: 'u1',
      roles: ['admin'],
      permissions: ['billing:manage'],
    });

    const hasEntitlement = component.billingKit.createEntitlementChecker({
      features: ['analytics', 'workflows'],
    });

    expect(auth.hasRole('admin')).toBe(true);
    expect(auth.hasPermission('billing:manage')).toBe(true);
    expect(hasEntitlement('analytics')).toBe(true);
    expect(hasEntitlement('inbox')).toBe(false);
  });

  it('applies default empty roles and permissions in auth kit', () => {
    const auth = component.authKit.createContext({
      tenantId: 't2',
      userId: 'u2',
    });

    expect(auth.roles).toEqual([]);
    expect(auth.permissions).toEqual([]);
    expect(auth.hasRole('admin')).toBe(false);
    expect(auth.hasPermission('billing:manage')).toBe(false);
  });

  it('supports data grid operations via unified namespace', () => {
    const sorted = sortUsingComponent(
      [
        { name: 'B', score: 2 },
        { name: 'A', score: 1 },
      ],
      [{ id: 'name', direction: 'asc', selector: (row) => row.name }]
    );

    expect(sorted.map((row) => row.name)).toEqual(['A', 'B']);

    const table = component.dataGridPro.createTable({
      data: [{ id: 'u1', name: 'Alice' }],
      columns: [{ key: 'name', header: 'Name', dataType: 'text' }],
      rowKey: 'id',
    });

    expect(table.getTableRows()[0]?.cells[0]?.displayValue).toBe('Alice');
  });

  it('supports kebab-case aliases using string keys', () => {
    expect(component['auth-kit']).toBe(component.authKit);
    expect(component['billing-kit']).toBe(component.billingKit);
    expect(component['data-grid-pro']).toBe(component.dataGridPro);
  });

  it('provides remaining kit helpers', () => {
    expect(component.tenantOrgKit.canAccessTenant({ tenantId: 't1', allowedTenantIds: ['t1'] })).toBe(true);
    expect(component.formsValidationKit.validateRequired({ name: '', age: 1 }, ['name', 'age'])).toEqual(['name']);

    const rule = component.workflowAutomationUi.createRule('on-create', ['send-email']);
    expect(rule).toEqual({ trigger: 'on-create', actions: ['send-email'] });

    expect(component.analyticsDashboardKit.createKpiCard('MRR', 1200, 10)).toEqual({
      label: 'MRR',
      value: 1200,
      delta: 10,
    });

    expect(
      component.notificationsInboxKit.unreadCount([
        { id: '1', title: 'A', read: false, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: '2', title: 'B', read: true, createdAt: '2026-01-01T00:00:00.000Z' },
      ])
    ).toBe(1);

    expect(component.adminOpsConsoleKit.isFeatureEnabled({ beta: true }, 'beta')).toBe(true);
    expect(component.adminOpsConsoleKit.isFeatureEnabled({ beta: true }, 'other')).toBe(false);

    expect(component.onboardingAdoptionKit.completionRatio([true, false, true])).toBeCloseTo(2 / 3, 5);
    expect(component.onboardingAdoptionKit.completionRatio([])).toBe(0);

    expect(component.foundationPrimitives.supportedTracks.length).toBe(5);
  });
});
