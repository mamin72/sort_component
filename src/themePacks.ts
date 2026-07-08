import {
  createTokenSchema,
  type TokenAliasMap,
  type TokenDictionary,
  type TokenSchema,
} from './tokenSchema';

export type ThemeName = 'light' | 'dark' | 'high-contrast';

export interface ThemePack<
  TTokens extends TokenDictionary = TokenDictionary,
  TAliases extends TokenAliasMap<TTokens> = TokenAliasMap<TTokens>,
> {
  name: ThemeName;
  schema: TokenSchema<TTokens, TAliases>;
}

const baseSemanticAliases = {
  'color.page.background': 'color.surface.canvas',
  'color.page.text': 'color.text.primary',
  'color.card.background': 'color.surface.elevated',
  'color.card.border': 'color.border.default',
  'color.action.primary.background': 'color.brand.primary',
  'color.action.primary.text': 'color.text.inverse',
  'color.input.border.default': 'color.border.default',
  'color.input.border.focus': 'color.focus.ring',
} as const;

const defaultThemeNamingConvention = {
  allowedPrefixes: ['color', 'space', 'radius', 'opacity'],
} as const;

export function createThemePack<
  TTokens extends TokenDictionary,
  TAliases extends TokenAliasMap<TTokens> = TokenAliasMap<TTokens>,
>(name: ThemeName, tokens: TTokens, semanticAliases?: TAliases): ThemePack<TTokens, TAliases> {
  const aliases = (semanticAliases ?? baseSemanticAliases) as TAliases;

  return {
    name,
    schema: createTokenSchema({
      tokens,
      semanticAliases: aliases,
      namingConvention: defaultThemeNamingConvention,
    }),
  };
}

export function createBaselineThemePacks(): Record<ThemeName, ThemePack> {
  const light = createThemePack('light', {
    'color.surface.canvas': '#ffffff',
    'color.surface.elevated': '#f8fafc',
    'color.text.primary': '#111827',
    'color.text.inverse': '#ffffff',
    'color.border.default': '#d1d5db',
    'color.focus.ring': '#2563eb',
    'color.brand.primary': '#2563eb',
    'color.status.success': '#16a34a',
    'color.status.warning': '#d97706',
    'color.status.danger': '#dc2626',
    'space.scale.100': 4,
    'space.scale.200': 8,
    'space.scale.300': 12,
    'radius.scale.100': 4,
    'radius.scale.200': 8,
    'opacity.disabled.100': 0.5,
  });

  const dark = createThemePack('dark', {
    'color.surface.canvas': '#0b1220',
    'color.surface.elevated': '#111a2e',
    'color.text.primary': '#f3f4f6',
    'color.text.inverse': '#0b1220',
    'color.border.default': '#334155',
    'color.focus.ring': '#60a5fa',
    'color.brand.primary': '#60a5fa',
    'color.status.success': '#4ade80',
    'color.status.warning': '#f59e0b',
    'color.status.danger': '#f87171',
    'space.scale.100': 4,
    'space.scale.200': 8,
    'space.scale.300': 12,
    'radius.scale.100': 4,
    'radius.scale.200': 8,
    'opacity.disabled.100': 0.55,
  });

  const highContrast = createThemePack('high-contrast', {
    'color.surface.canvas': '#000000',
    'color.surface.elevated': '#0a0a0a',
    'color.text.primary': '#ffffff',
    'color.text.inverse': '#000000',
    'color.border.default': '#ffffff',
    'color.focus.ring': '#00ffff',
    'color.brand.primary': '#ffff00',
    'color.status.success': '#00ff00',
    'color.status.warning': '#ffff00',
    'color.status.danger': '#ff0033',
    'space.scale.100': 4,
    'space.scale.200': 8,
    'space.scale.300': 12,
    'radius.scale.100': 4,
    'radius.scale.200': 8,
    'opacity.disabled.100': 0.6,
  });

  const packs = {
    light,
    dark,
    'high-contrast': highContrast,
  } satisfies Record<ThemeName, ThemePack>;

  assertThemePacksShareTokenCoverage(packs);
  assertThemePacksShareAliasCoverage(packs);

  return packs;
}

export const baselineThemePacks = Object.freeze(createBaselineThemePacks());

export function assertThemePacksShareTokenCoverage(themePacks: Record<ThemeName, ThemePack>): void {
  const [firstName, ...restNames] = Object.keys(themePacks) as ThemeName[];
  const baselineTokenKeys = sortedKeys(themePacks[firstName].schema.tokens);

  for (const name of restNames) {
    const candidateTokenKeys = sortedKeys(themePacks[name].schema.tokens);
    const differences = diffKeys(baselineTokenKeys, candidateTokenKeys);

    if (differences.length > 0) {
      throw new Error(
        `Theme '${name}' token coverage does not match baseline theme '${firstName}'. Differences: ${differences.join(', ')}.`
      );
    }
  }
}

export function assertThemePacksShareAliasCoverage(themePacks: Record<ThemeName, ThemePack>): void {
  const [firstName, ...restNames] = Object.keys(themePacks) as ThemeName[];
  const baselineAliasKeys = sortedKeys(themePacks[firstName].schema.semanticAliases);

  for (const name of restNames) {
    const candidateAliasKeys = sortedKeys(themePacks[name].schema.semanticAliases);
    const differences = diffKeys(baselineAliasKeys, candidateAliasKeys);

    if (differences.length > 0) {
      throw new Error(
        `Theme '${name}' alias coverage does not match baseline theme '${firstName}'. Differences: ${differences.join(', ')}.`
      );
    }
  }
}

function sortedKeys(dictionary: TokenDictionary): string[] {
  return Object.keys(dictionary).sort((a, b) => a.localeCompare(b));
}

function diffKeys(expected: string[], actual: string[]): string[] {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const differences: string[] = [];

  for (const key of expected) {
    if (!actualSet.has(key)) {
      differences.push(`missing:${key}`);
    }
  }

  for (const key of actual) {
    if (!expectedSet.has(key)) {
      differences.push(`extra:${key}`);
    }
  }

  return differences;
}
