import { describe, expect, it } from 'vitest';
import {
  assertThemePacksShareAliasCoverage,
  assertThemePacksShareTokenCoverage,
  baselineThemePacks,
  createThemePack,
} from '../src/index';

describe('theme packs', () => {
  it('provides baseline light, dark, and high-contrast packs', () => {
    expect(Object.keys(baselineThemePacks).sort()).toEqual(['dark', 'high-contrast', 'light']);

    expect(baselineThemePacks.light.name).toBe('light');
    expect(baselineThemePacks.dark.name).toBe('dark');
    expect(baselineThemePacks['high-contrast'].name).toBe('high-contrast');

    expect(baselineThemePacks.light.schema.tokens['color.brand.primary']).toBe('#2563eb');
    expect(baselineThemePacks.dark.schema.tokens['color.brand.primary']).toBe('#60a5fa');
    expect(baselineThemePacks['high-contrast'].schema.tokens['color.brand.primary']).toBe('#ffff00');
  });

  it('keeps token and alias coverage consistent across baseline packs', () => {
    expect(() => assertThemePacksShareTokenCoverage(baselineThemePacks)).not.toThrow();
    expect(() => assertThemePacksShareAliasCoverage(baselineThemePacks)).not.toThrow();

    const baselineAliasKey = 'color.action.primary.background';
    expect(baselineThemePacks.light.schema.semanticAliases[baselineAliasKey]).toBe('color.brand.primary');
    expect(baselineThemePacks.dark.schema.semanticAliases[baselineAliasKey]).toBe('color.brand.primary');
    expect(baselineThemePacks['high-contrast'].schema.semanticAliases[baselineAliasKey]).toBe(
      'color.brand.primary'
    );
  });

  it('detects mismatched token coverage across packs', () => {
    const brokenPacks = {
      ...baselineThemePacks,
      dark: createThemePack('dark', {
        ...baselineThemePacks.dark.schema.tokens,
        'color.debug.extra': '#ff00ff',
      }),
    };

    expect(() => assertThemePacksShareTokenCoverage(brokenPacks)).toThrow(
      "Theme 'dark' token coverage does not match baseline theme 'light'."
    );
  });

  it('detects mismatched alias coverage across packs', () => {
    const brokenPacks = {
      ...baselineThemePacks,
      dark: createThemePack('dark', baselineThemePacks.dark.schema.tokens, {
        ...baselineThemePacks.dark.schema.semanticAliases,
        'color.debug.alias': 'color.brand.primary',
      }),
    };

    expect(() => assertThemePacksShareAliasCoverage(brokenPacks)).toThrow(
      "Theme 'dark' alias coverage does not match baseline theme 'light'."
    );
  });

  it('detects missing alias keys across packs', () => {
    const remainingAliases = Object.fromEntries(
      Object.entries(baselineThemePacks.dark.schema.semanticAliases).filter(
        ([key]) => key !== 'color.page.background'
      )
    );

    const brokenPacks = {
      ...baselineThemePacks,
      dark: createThemePack('dark', baselineThemePacks.dark.schema.tokens, remainingAliases),
    };

    expect(() => assertThemePacksShareAliasCoverage(brokenPacks)).toThrow(
      "Theme 'dark' alias coverage does not match baseline theme 'light'."
    );
  });
});
