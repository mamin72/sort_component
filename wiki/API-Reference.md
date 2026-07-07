# API Reference

## sortByRules

```ts
sortByRules<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[]
```

Returns a new sorted array based on the ordered list of rules.

## SortRule

```ts
interface SortRule<T> {
  id: string;
  direction: "asc" | "desc";
  selector: (item: T) => string | number | boolean | Date | null | undefined;
  nulls?: "first" | "last";
}
```

### Behavior

- Rules are evaluated in order.
- First non-zero comparison decides order.
- If all rules tie, original relative order is preserved by sort semantics.

## parseAndSort

```ts
parseAndSort<T>(input: unknown, options: ParseAndSortOptions<T>): T[]
```

Parses supported formats and applies sorting in one call.

Supported formats:

- json
- jsonl
- csv
- tsv
- xml
- yaml

## parseAndSortFromStream

```ts
parseAndSortFromStream<T>(stream: Readable, options: ParseAndSortOptions<T>): Promise<T[]>
```

Reads stream content, parses by format, and returns sorted rows.

## parseRecords

```ts
parseRecords(input: unknown, options?: ParseOptions): ParsedRecord[]
```

Parses input without sorting; useful when you need pre-processing before ordering.

## registerCodec

```ts
registerCodec(codec: FormatCodec): void
```

Registers or overrides a format codec for custom parsing behavior.

See also: [Data Formats](Data-Formats)
