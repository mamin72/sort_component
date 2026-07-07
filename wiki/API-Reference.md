# API Reference

## sortByRules

```ts
sortByRules<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[]
```

Returns a new sorted array based on the ordered list of rules.

Input note:

- `items` must be an in-memory array (`readonly T[]`).
- Raw text, streams, JSON text, and XML should be parsed into typed arrays before sorting.

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

See also: [Data Formats](Data-Formats)
