export type TranslationPlaceholderType = 'string' | 'number' | 'boolean' | 'date';

export interface TranslationPlaceholderContract {
  name: string;
  type: TranslationPlaceholderType;
  required: boolean;
}

export interface TranslationKeyContract {
  key: string;
  description?: string;
  placeholders: readonly TranslationPlaceholderContract[];
  fallbackMessage?: string;
}

export type MissingKeyPolicy = 'throw' | 'fallback-message' | 'return-key';

export interface MessageFormatterContract {
  locale: string;
  fallbackLocale: string;
  timeZone?: string;
  missingKeyPolicy: MissingKeyPolicy;
}

export interface MessageCatalogEntry {
  key: string;
  locale: string;
  template: string;
}

export interface MessageCatalog {
  has(locale: string, key: string): boolean;
  resolve(locale: string, key: string): string | undefined;
  listKeys(locale?: string): readonly string[];
}

export interface MessageFormatResult {
  key: string;
  locale: string;
  message: string;
  usedFallbackLocale: boolean;
  missingPlaceholders: readonly string[];
  extraPlaceholders: readonly string[];
}

export function createTranslationKeyContract(input: {
  key: string;
  description?: string;
  placeholders?: readonly {
    name: string;
    type?: TranslationPlaceholderType;
    required?: boolean;
  }[];
  fallbackMessage?: string;
}): TranslationKeyContract {
  const key = input.key.trim();
  if (key.length === 0) {
    throw new Error('Translation key must be non-empty.');
  }

  if (!/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/.test(key)) {
    throw new Error(`Translation key '${input.key}' must use dot-separated lowercase segments.`);
  }

  const placeholders = normalizePlaceholders(input.placeholders);
  const description = input.description?.trim();
  const fallbackMessage = input.fallbackMessage?.trim();

  return {
    key,
    description: description && description.length > 0 ? description : undefined,
    placeholders,
    fallbackMessage: fallbackMessage && fallbackMessage.length > 0 ? fallbackMessage : undefined,
  };
}

export function createMessageFormatterContract(input: {
  locale: string;
  fallbackLocale?: string;
  timeZone?: string;
  missingKeyPolicy?: MissingKeyPolicy;
}): MessageFormatterContract {
  const locale = input.locale.trim();
  if (locale.length === 0) {
    throw new Error('Message formatter locale must be non-empty.');
  }

  const fallbackLocale = (input.fallbackLocale ?? locale).trim();
  if (fallbackLocale.length === 0) {
    throw new Error('Message formatter fallback locale must be non-empty.');
  }

  const timeZone = input.timeZone?.trim();

  return {
    locale,
    fallbackLocale,
    timeZone: timeZone && timeZone.length > 0 ? timeZone : undefined,
    missingKeyPolicy: input.missingKeyPolicy ?? 'throw',
  };
}

export function createMessageCatalog(entries: readonly MessageCatalogEntry[]): MessageCatalog {
  const index = new Map<string, string>();
  const keysByLocale = new Map<string, Set<string>>();

  for (const entry of entries) {
    const locale = entry.locale.trim();
    const key = entry.key.trim();
    const template = entry.template.trim();

    if (locale.length === 0 || key.length === 0 || template.length === 0) {
      throw new Error('Message catalog entries must include non-empty locale, key, and template.');
    }

    index.set(`${locale}::${key}`, template);

    if (!keysByLocale.has(locale)) {
      keysByLocale.set(locale, new Set());
    }

    keysByLocale.get(locale)!.add(key);
  }

  return {
    has(locale: string, key: string): boolean {
      return index.has(`${locale.trim()}::${key.trim()}`);
    },
    resolve(locale: string, key: string): string | undefined {
      return index.get(`${locale.trim()}::${key.trim()}`);
    },
    listKeys(locale?: string): readonly string[] {
      if (locale) {
        return Array.from(keysByLocale.get(locale.trim()) ?? []).sort((a, b) => a.localeCompare(b));
      }

      return Array.from(new Set(Array.from(index.keys()).map((entryKey) => entryKey.split('::')[1] ?? '')))
        .filter((key) => key.length > 0)
        .sort((a, b) => a.localeCompare(b));
    },
  };
}

export function formatMessage(input: {
  contract: TranslationKeyContract;
  formatter: MessageFormatterContract;
  catalog: MessageCatalog;
  values?: Readonly<Record<string, unknown>>;
  localeOverride?: string;
}): MessageFormatResult {
  const requestedLocale = input.localeOverride?.trim() || input.formatter.locale;

  const primaryTemplate = input.catalog.resolve(requestedLocale, input.contract.key);
  const fallbackTemplate = input.catalog.resolve(input.formatter.fallbackLocale, input.contract.key);

  const resolvedTemplate = primaryTemplate ?? fallbackTemplate;
  const usedFallbackLocale = !primaryTemplate && !!fallbackTemplate;
  const effectiveLocale = primaryTemplate ? requestedLocale : input.formatter.fallbackLocale;

  if (!resolvedTemplate) {
    if (input.formatter.missingKeyPolicy === 'return-key') {
      return {
        key: input.contract.key,
        locale: effectiveLocale,
        message: input.contract.key,
        usedFallbackLocale: false,
        missingPlaceholders: [],
        extraPlaceholders: [],
      };
    }

    if (input.formatter.missingKeyPolicy === 'fallback-message' && input.contract.fallbackMessage) {
      return {
        key: input.contract.key,
        locale: effectiveLocale,
        message: input.contract.fallbackMessage,
        usedFallbackLocale: false,
        missingPlaceholders: [],
        extraPlaceholders: [],
      };
    }

    throw new Error(`No message template found for key '${input.contract.key}' in locale '${requestedLocale}'.`);
  }

  const values = input.values ?? {};
  const placeholderNames = input.contract.placeholders.map((placeholder) => placeholder.name);

  const missingPlaceholders = input.contract.placeholders
    .filter((placeholder) => placeholder.required && values[placeholder.name] == null)
    .map((placeholder) => placeholder.name);

  const extraPlaceholders = Object.keys(values)
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
    .filter((key) => !placeholderNames.includes(key))
    .sort((a, b) => a.localeCompare(b));

  let message = resolvedTemplate;

  for (const placeholder of input.contract.placeholders) {
    const value = values[placeholder.name];
    if (value == null) {
      continue;
    }

    const rendered = renderPlaceholderValue(placeholder, value, effectiveLocale, input.formatter.timeZone);
    message = message.split(`{${placeholder.name}}`).join(rendered);
  }

  return {
    key: input.contract.key,
    locale: effectiveLocale,
    message,
    usedFallbackLocale,
    missingPlaceholders,
    extraPlaceholders,
  };
}

function normalizePlaceholders(
  placeholders?: readonly {
    name: string;
    type?: TranslationPlaceholderType;
    required?: boolean;
  }[]
): readonly TranslationPlaceholderContract[] {
  if (!placeholders) {
    return [];
  }

  const normalized = new Map<string, TranslationPlaceholderContract>();

  for (const placeholder of placeholders) {
    const name = placeholder.name.trim();
    if (name.length === 0) {
      throw new Error('Translation placeholder name must be non-empty.');
    }

    normalized.set(name, {
      name,
      type: placeholder.type ?? 'string',
      required: placeholder.required ?? true,
    });
  }

  return Array.from(normalized.values());
}

function renderPlaceholderValue(
  placeholder: TranslationPlaceholderContract,
  value: unknown,
  locale: string,
  timeZone?: string
): string {
  switch (placeholder.type) {
    case 'number':
      if (typeof value !== 'number') {
        throw new Error(`Placeholder '${placeholder.name}' expects a number value.`);
      }
      return new Intl.NumberFormat(locale).format(value);
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`Placeholder '${placeholder.name}' expects a boolean value.`);
      }
      return value ? 'true' : 'false';
    case 'date': {
      const dateValue = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(dateValue.getTime())) {
        throw new Error(`Placeholder '${placeholder.name}' expects a valid date value.`);
      }

      return new Intl.DateTimeFormat(locale, {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateValue);
    }
    case 'string':
    default:
      return String(value);
  }
}
