import { describe, expect, it } from 'vitest';
import {
  createMessageCatalog,
  createMessageFormatterContract,
  createTranslationKeyContract,
  formatMessage,
} from '../src/index';

describe('i18n message contracts', () => {
  it('creates normalized translation key contracts', () => {
    const contract = createTranslationKeyContract({
      key: ' users.table.empty_state ',
      description: ' Empty state title ',
      placeholders: [
        { name: ' userName ', type: 'string' },
        { name: 'count', type: 'number' },
        { name: 'count', type: 'number', required: false },
      ],
      fallbackMessage: ' No users found ',
    });

    expect(contract.key).toBe('users.table.empty_state');
    expect(contract.description).toBe('Empty state title');
    expect(contract.placeholders).toEqual([
      { name: 'userName', type: 'string', required: true },
      { name: 'count', type: 'number', required: false },
    ]);
    expect(contract.fallbackMessage).toBe('No users found');
  });

  it('rejects invalid translation keys and placeholder names', () => {
    expect(() => createTranslationKeyContract({ key: ' ' })).toThrow('Translation key must be non-empty.');

    expect(() => createTranslationKeyContract({ key: 'Users.Bad.Key' })).toThrow(
      "Translation key 'Users.Bad.Key' must use dot-separated lowercase segments."
    );

    expect(() =>
      createTranslationKeyContract({
        key: 'users.valid.key',
        placeholders: [{ name: '  ' }],
      })
    ).toThrow('Translation placeholder name must be non-empty.');
  });

  it('creates message formatter contracts with defaults and trimming', () => {
    const formatter = createMessageFormatterContract({
      locale: ' en-US ',
      timeZone: '  UTC  ',
    });

    expect(formatter).toEqual({
      locale: 'en-US',
      fallbackLocale: 'en-US',
      timeZone: 'UTC',
      missingKeyPolicy: 'throw',
    });

    expect(() => createMessageFormatterContract({ locale: ' ' })).toThrow(
      'Message formatter locale must be non-empty.'
    );

    expect(() => createMessageFormatterContract({ locale: 'en-US', fallbackLocale: ' ' })).toThrow(
      'Message formatter fallback locale must be non-empty.'
    );
  });

  it('creates message catalogs and resolves localized templates', () => {
    const catalog = createMessageCatalog([
      { locale: 'en-US', key: 'users.welcome.title', template: 'Welcome {name}' },
      { locale: 'de-DE', key: 'users.welcome.title', template: 'Willkommen {name}' },
      { locale: 'en-US', key: 'users.welcome.subtitle', template: 'Sub {name}' },
    ]);

    expect(catalog.has('en-US', 'users.welcome.title')).toBe(true);
    expect(catalog.resolve('de-DE', 'users.welcome.title')).toBe('Willkommen {name}');
    expect(catalog.listKeys('en-US')).toEqual(['users.welcome.subtitle', 'users.welcome.title']);
    expect(catalog.listKeys('fr-FR')).toEqual([]);
    expect(catalog.listKeys()).toEqual(['users.welcome.subtitle', 'users.welcome.title']);

    expect(() =>
      createMessageCatalog([
        { locale: '', key: 'users.welcome.title', template: 'Welcome {name}' },
      ])
    ).toThrow('Message catalog entries must include non-empty locale, key, and template.');
  });

  it('formats messages using locale override and fallback locale resolution', () => {
    const contract = createTranslationKeyContract({
      key: 'users.summary.message',
      placeholders: [
        { name: 'name', type: 'string' },
        { name: 'count', type: 'number' },
      ],
    });

    const formatter = createMessageFormatterContract({
      locale: 'en-US',
      fallbackLocale: 'de-DE',
      missingKeyPolicy: 'throw',
    });

    const catalog = createMessageCatalog([
      { locale: 'de-DE', key: 'users.summary.message', template: 'Hallo {name}, {count} Nutzer' },
    ]);

    const result = formatMessage({
      contract,
      formatter,
      catalog,
      localeOverride: 'fr-FR',
      values: {
        name: 'Ava',
        count: 3,
      },
    });

    expect(result.locale).toBe('de-DE');
    expect(result.usedFallbackLocale).toBe(true);
    expect(result.message).toContain('Hallo Ava');
  });

  it('tracks missing and extra placeholders when formatting', () => {
    const contract = createTranslationKeyContract({
      key: 'users.invite.body',
      placeholders: [
        { name: 'email', type: 'string' },
        { name: 'isAdmin', type: 'boolean', required: false },
      ],
    });

    const formatter = createMessageFormatterContract({ locale: 'en-US' });
    const catalog = createMessageCatalog([
      { locale: 'en-US', key: 'users.invite.body', template: 'Invite {email} admin={isAdmin}' },
    ]);

    const result = formatMessage({
      contract,
      formatter,
      catalog,
      values: {
        zExtra: 'later',
        extra: 'value',
        aExtra: 'first',
      },
    });

    expect(result.missingPlaceholders).toEqual(['email']);
    expect(result.extraPlaceholders).toEqual(['aExtra', 'extra', 'zExtra']);

    const resultWithoutValues = formatMessage({
      contract,
      formatter,
      catalog,
    });

    expect(resultWithoutValues.missingPlaceholders).toEqual(['email']);
    expect(resultWithoutValues.extraPlaceholders).toEqual([]);
  });

  it('supports missing-key fallback-message and return-key policies', () => {
    const contract = createTranslationKeyContract({
      key: 'users.missing.template',
      fallbackMessage: 'Fallback text',
    });

    const catalog = createMessageCatalog([]);

    const fallbackFormatter = createMessageFormatterContract({
      locale: 'en-US',
      missingKeyPolicy: 'fallback-message',
    });

    const fallbackResult = formatMessage({
      contract,
      formatter: fallbackFormatter,
      catalog,
    });

    expect(fallbackResult.message).toBe('Fallback text');

    const returnKeyFormatter = createMessageFormatterContract({
      locale: 'en-US',
      missingKeyPolicy: 'return-key',
    });

    const returnKeyResult = formatMessage({
      contract,
      formatter: returnKeyFormatter,
      catalog,
    });

    expect(returnKeyResult.message).toBe('users.missing.template');

    const throwFormatter = createMessageFormatterContract({
      locale: 'en-US',
      missingKeyPolicy: 'throw',
    });

    expect(() =>
      formatMessage({
        contract,
        formatter: throwFormatter,
        catalog,
      })
    ).toThrow("No message template found for key 'users.missing.template' in locale 'en-US'.");

    const noFallbackContract = createTranslationKeyContract({
      key: 'users.missing.without_fallback',
    });

    expect(() =>
      formatMessage({
        contract: noFallbackContract,
        formatter: fallbackFormatter,
        catalog,
      })
    ).toThrow("No message template found for key 'users.missing.without_fallback' in locale 'en-US'.");
  });

  it('validates typed placeholder rendering for number, boolean, and date', () => {
    const contract = createTranslationKeyContract({
      key: 'users.typed.message',
      placeholders: [
        { name: 'count', type: 'number' },
        { name: 'enabled', type: 'boolean' },
        { name: 'createdAt', type: 'date' },
      ],
    });

    const formatter = createMessageFormatterContract({
      locale: 'en-US',
      fallbackLocale: 'en-US',
      timeZone: 'UTC',
    });

    const catalog = createMessageCatalog([
      { locale: 'en-US', key: 'users.typed.message', template: 'count={count} enabled={enabled} date={createdAt}' },
    ]);

    const result = formatMessage({
      contract,
      formatter,
      catalog,
      values: {
        count: 42,
        enabled: true,
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
      },
    });

    expect(result.message).toContain('count=42');
    expect(result.message).toContain('enabled=true');
    expect(result.message).toContain('date=');

    expect(() =>
      formatMessage({
        contract,
        formatter,
        catalog,
        values: {
          count: 'invalid',
          enabled: true,
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      })
    ).toThrow("Placeholder 'count' expects a number value.");

    expect(() =>
      formatMessage({
        contract,
        formatter,
        catalog,
        values: {
          count: 1,
          enabled: 'true',
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      })
    ).toThrow("Placeholder 'enabled' expects a boolean value.");

    expect(() =>
      formatMessage({
        contract,
        formatter,
        catalog,
        values: {
          count: 1,
          enabled: true,
          createdAt: 'invalid-date',
        },
      })
    ).toThrow("Placeholder 'createdAt' expects a valid date value.");
  });
});
