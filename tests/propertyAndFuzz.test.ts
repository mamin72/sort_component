import { describe, expect, it } from 'vitest';
import { parseRecords, sortByRules, type SortRule } from '../src/index';

type PropertyRow = {
  readonly id: string;
  readonly group: 'alpha' | 'beta' | 'gamma';
  readonly score: number;
  readonly active: boolean;
  readonly createdAt: Date;
};

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRows(size: number, seed: number): PropertyRow[] {
  const rng = createSeededRng(seed);
  const groups: Array<PropertyRow['group']> = ['alpha', 'beta', 'gamma'];

  return Array.from({ length: size }, (_, index) => ({
    id: `row-${String(index + 1).padStart(4, '0')}`,
    group: groups[Math.floor(rng() * groups.length)] ?? 'alpha',
    score: Math.floor(rng() * 1000),
    active: rng() > 0.5,
    createdAt: new Date(Date.UTC(2025, 0, 1 + Math.floor(rng() * 30))),
  }));
}

function groupBy<T>(items: readonly T[], selector: (item: T) => string): Map<string, T[]> {
  const output = new Map<string, T[]>();
  for (const item of items) {
    const key = selector(item);
    const group = output.get(key) ?? [];
    group.push(item);
    output.set(key, group);
  }

  return output;
}

describe('property and fuzz tests', () => {
  describe('sort correctness properties', () => {
    it('keeps ordering monotonic for deterministic generated datasets', () => {
      const cases = [
        { size: 25, seed: 1001 },
        { size: 50, seed: 2047 },
        { size: 100, seed: 4093 },
      ];

      for (const benchmarkCase of cases) {
        const rows = generateRows(benchmarkCase.size, benchmarkCase.seed);
        const sortedAsc = sortByRules(rows, [{ id: 'score', direction: 'asc', selector: (row) => row.score }]);
        const sortedDesc = sortByRules(rows, [{ id: 'score', direction: 'desc', selector: (row) => row.score }]);

        for (let index = 1; index < sortedAsc.length; index += 1) {
          const previous = sortedAsc[index - 1];
          const current = sortedAsc[index];
          expect(previous != null && current != null && previous.score <= current.score).toBe(true);
        }

        for (let index = 1; index < sortedDesc.length; index += 1) {
          const previous = sortedDesc[index - 1];
          const current = sortedDesc[index];
          expect(previous != null && current != null && previous.score >= current.score).toBe(true);
        }
      }
    });

    it('is idempotent under repeated application of the same sort rules', () => {
      const rows = generateRows(120, 9001);
      const rules: readonly SortRule<PropertyRow>[] = [
        { id: 'group', direction: 'asc', selector: (row) => row.group },
        { id: 'score', direction: 'desc', selector: (row) => row.score },
        { id: 'id', direction: 'asc', selector: (row) => row.id },
      ];

      const once = sortByRules(rows, rules);
      const twice = sortByRules(once, rules);
      expect(twice).toEqual(once);
    });

    it('preserves membership counts and input immutability', () => {
      const rows = generateRows(90, 7781);
      const snapshot = rows.map((row) => ({ ...row }));

      const sorted = sortByRules(rows, [
        { id: 'active', direction: 'asc', selector: (row) => row.active },
        { id: 'createdAt', direction: 'asc', selector: (row) => row.createdAt },
      ]);

      const originalCounts = groupBy(rows, (row) => `${row.group}:${row.active}`);
      const sortedCounts = groupBy(sorted, (row) => `${row.group}:${row.active}`);

      expect(rows).toEqual(snapshot);
      expect(sorted.length).toBe(rows.length);
      for (const [key, value] of originalCounts.entries()) {
        expect(sortedCounts.get(key)?.length).toBe(value.length);
      }
    });
  });

  describe('parser fuzz coverage', () => {
    it('throws for malformed JSON and JSONL payload variants', () => {
      const malformedJsonPayloads = [
        '{"a":1',
        '[{"a":1},',
        '{"a": [1, 2,}',
        '{"a":"unterminated}',
      ];

      for (const payload of malformedJsonPayloads) {
        expect(() => parseRecords(payload, { format: 'json' })).toThrow();
      }

      const malformedJsonlPayloads = [
        '{"a":1}\n{"a":2',
        '{"a":1}\n[1,2]',
        '{"a":1}\n{"b":',
      ];

      for (const payload of malformedJsonlPayloads) {
        expect(() => parseRecords(payload, { format: 'jsonl' })).toThrow();
      }
    });

    it('throws for malformed YAML payload variants', () => {
      const malformedYamlPayloads = [
        'root:\n - [1,2',
        'name: "unterminated',
        'list:\n  - id: 1\n   - id: 2',
      ];

      for (const payload of malformedYamlPayloads) {
        expect(() => parseRecords(payload, { format: 'yaml' })).toThrow();
      }
    });

    it('handles CSV fuzz edge cases with bounded behavior', () => {
      const csvCases = [
        {
          payload: 'id,name\n1,"unterminated',
          expected: [{ id: '1', name: 'unterminated' }],
        },
        {
          payload: 'id,name\n1,"a""b"',
          expected: [{ id: '1', name: 'a"b' }],
        },
        {
          payload: 'id,name\n1,"a,b"\n2,"c,d"',
          expected: [
            { id: '1', name: 'a,b' },
            { id: '2', name: 'c,d' },
          ],
        },
      ];

      for (const testCase of csvCases) {
        expect(parseRecords(testCase.payload, { format: 'csv' })).toEqual(testCase.expected);
      }
    });
  });
});
