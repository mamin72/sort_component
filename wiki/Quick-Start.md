# Quick Start

## Install

```bash
npm install sort_component
```

## Basic Example

```ts
import { sortByRules, type SortRule } from "sort_component";

type Person = {
  lastName: string;
  givenNames: string[];
};

const rules: SortRule<Person>[] = [
  { id: "last", direction: "asc", selector: (x) => x.lastName },
  { id: "g1", direction: "asc", selector: (x) => x.givenNames[0] },
  { id: "g2", direction: "asc", selector: (x) => x.givenNames[1] }
];

const sorted = sortByRules(data, rules);
```

## Supported Input Format

The sorter works on in-memory arrays.

- Direct input: typed array data (`T[]`)
- Parse-first input: raw text, streams, JSON text, XML text

See [Data Formats](Data-Formats) for parser mapping guidance.

## Quality Commands (for contributors)

```bash
npm run quality:check
```
