# Data Formats

## Core Contract

`sort_component` accepts in-memory arrays and sorts them by rule selectors.

```ts
sortByRules<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[]
```

This means the direct input type is `readonly T[]`.

## What You Can Pass Directly

- Arrays of objects
- Arrays of strings, numbers, booleans, or dates (with matching selectors)

## What You Should Parse First

- Plain text strings
- Text streams
- JSON text payloads
- XML payloads

## Recommended Mapping by Source

- Text string:
  - split into records (for example lines)
  - parse fields
  - map to typed objects
- Text stream:
  - consume stream chunks
  - frame records (line or delimiter based)
  - map to typed objects
- JSON:
  - parse JSON
  - validate required fields
  - map to typed objects
- XML:
  - parse XML to JS objects
  - normalize structure
  - map to typed objects

## Practical Rule

Parsing and validation are your adapter responsibility.
Sorting is the library responsibility.

## Integration Pattern

Keep parser + mapper in your app common components layer, then call `sortByRules` with typed arrays.
