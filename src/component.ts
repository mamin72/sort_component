import { parseAndSort } from './formatSupport';
import { JsonTableComponent, type JsonTableComponentOptions } from './tableComponent';
import { sortByRules, type SortRule } from './sortByRules';

export interface AuthContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  hasRole(role: string): boolean;
  hasPermission(permission: string): boolean;
}

export interface EntitlementInput {
  readonly features: readonly string[];
}

export interface TenantAccessInput {
  readonly tenantId: string;
  readonly allowedTenantIds: readonly string[];
}

export interface WorkflowRule {
  readonly trigger: string;
  readonly actions: readonly string[];
}

export interface KpiCard {
  readonly label: string;
  readonly value: number;
  readonly delta?: number;
}

export interface InboxItem {
  readonly id: string;
  readonly title: string;
  readonly read: boolean;
  readonly createdAt: string;
}

export const authKit = {
  createContext(input: {
    tenantId: string;
    userId: string;
    roles?: readonly string[];
    permissions?: readonly string[];
  }): AuthContext {
    const roles = input.roles ?? [];
    const permissions = input.permissions ?? [];

    return {
      tenantId: input.tenantId,
      userId: input.userId,
      roles,
      permissions,
      hasRole: (role: string): boolean => roles.includes(role),
      hasPermission: (permission: string): boolean => permissions.includes(permission),
    };
  },
};

export const billingKit = {
  createEntitlementChecker(input: EntitlementInput): (feature: string) => boolean {
    const features = new Set(input.features);
    return (feature: string): boolean => features.has(feature);
  },
};

export const tenantOrgKit = {
  canAccessTenant(input: TenantAccessInput): boolean {
    return input.allowedTenantIds.includes(input.tenantId);
  },
};

export const dataGridPro = {
  createTable<T extends Record<string, unknown>>(options: JsonTableComponentOptions<T>): JsonTableComponent<T> {
    return new JsonTableComponent(options);
  },
  sortByRules,
  parseAndSort,
};

export const formsValidationKit = {
  validateRequired<T extends Record<string, unknown>>(model: T, requiredFields: readonly (keyof T)[]): string[] {
    return requiredFields
      .filter((field) => {
        const value = model[field];
        return value == null || (typeof value === 'string' && value.trim().length === 0);
      })
      .map((field) => String(field));
  },
};

export const workflowAutomationUi = {
  createRule(trigger: string, actions: readonly string[]): WorkflowRule {
    return { trigger, actions };
  },
};

export const analyticsDashboardKit = {
  createKpiCard(label: string, value: number, delta?: number): KpiCard {
    return { label, value, delta };
  },
};

export const notificationsInboxKit = {
  unreadCount(items: readonly InboxItem[]): number {
    return items.filter((item) => !item.read).length;
  },
};

export const adminOpsConsoleKit = {
  isFeatureEnabled(flags: Readonly<Record<string, boolean>>, flagName: string): boolean {
    return flags[flagName] ?? false;
  },
};

export const onboardingAdoptionKit = {
  completionRatio(steps: readonly boolean[]): number {
    if (steps.length === 0) {
      return 0;
    }

    const completed = steps.filter(Boolean).length;
    return completed / steps.length;
  },
};

export const foundationPrimitives = {
  supportedTracks: [
    'design-tokens-and-theming',
    'data-and-state-primitives',
    'access-control-primitives',
    'error-and-resilience-primitives',
    'internationalization-and-localization',
  ] as const,
};

export const component = {
  authKit,
  billingKit,
  tenantOrgKit,
  dataGridPro,
  formsValidationKit,
  workflowAutomationUi,
  analyticsDashboardKit,
  notificationsInboxKit,
  adminOpsConsoleKit,
  onboardingAdoptionKit,
  foundationPrimitives,
  // Kebab-case aliases for string-key access: component['auth-kit']
  'auth-kit': authKit,
  'billing-kit': billingKit,
  'tenant-org-kit': tenantOrgKit,
  'data-grid-pro': dataGridPro,
  'forms-validation-kit': formsValidationKit,
  'workflow-automation-ui': workflowAutomationUi,
  'analytics-dashboard-kit': analyticsDashboardKit,
  'notifications-inbox-kit': notificationsInboxKit,
  'admin-ops-console-kit': adminOpsConsoleKit,
  'onboarding-adoption-kit': onboardingAdoptionKit,
  'foundation-primitives': foundationPrimitives,
} as const;

export type ComponentNamespace = typeof component;

export function sortUsingComponent<TItem>(items: readonly TItem[], rules: readonly SortRule<TItem>[]): readonly TItem[] {
  return component.dataGridPro.sortByRules(items, rules);
}
