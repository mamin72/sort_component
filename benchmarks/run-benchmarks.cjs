const { performance } = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');
const { JsonTableComponent } = require('../dist/tableComponent.js');

function parseArgs(argv) {
  const args = {
    sizes: [1000, 5000, 10000],
    iterations: 20,
    warmup: 3,
    out: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--sizes' && argv[index + 1] != null) {
      args.sizes = argv[index + 1]
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
      index += 1;
      continue;
    }

    if (token === '--iterations' && argv[index + 1] != null) {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value > 0) {
        args.iterations = Math.floor(value);
      }
      index += 1;
      continue;
    }

    if (token === '--warmup' && argv[index + 1] != null) {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value >= 0) {
        args.warmup = Math.floor(value);
      }
      index += 1;
      continue;
    }

    if (token === '--out' && argv[index + 1] != null) {
      args.out = argv[index + 1];
      index += 1;
      continue;
    }
  }

  if (args.sizes.length === 0) {
    throw new Error('At least one dataset size is required.');
  }

  return args;
}

function createSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(rng, minLength, maxLength) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const length = minLength + Math.floor(rng() * (maxLength - minLength + 1));
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += alphabet.charAt(Math.floor(rng() * alphabet.length));
  }
  return output;
}

function createDataset(size, seed) {
  const rng = createSeededRng(seed);
  const plans = ['free', 'starter', 'pro', 'enterprise'];
  const rows = new Array(size);

  for (let index = 0; index < size; index += 1) {
    const id = `u-${String(index + 1).padStart(6, '0')}`;
    const createdAt = new Date(
      Date.UTC(
        2024 + Math.floor(rng() * 3),
        Math.floor(rng() * 12),
        1 + Math.floor(rng() * 28),
        Math.floor(rng() * 24),
        Math.floor(rng() * 60),
        Math.floor(rng() * 60)
      )
    ).toISOString();

    rows[index] = {
      id,
      name: `${randomString(rng, 5, 9)} ${randomString(rng, 4, 8)}`,
      age: 18 + Math.floor(rng() * 60),
      amount: Number((rng() * 10000).toFixed(2)),
      active: rng() > 0.4,
      plan: plans[Math.floor(rng() * plans.length)],
      createdAt,
    };
  }

  return rows;
}

function createColumns() {
  return [
    { key: 'name', header: 'Name', dataType: 'text', sortable: true },
    { key: 'age', header: 'Age', dataType: 'number', sortable: true },
    { key: 'amount', header: 'Amount', dataType: 'currency', sortable: true, currencyCode: 'USD' },
    { key: 'active', header: 'Active', dataType: 'boolean', sortable: true },
    { key: 'plan', header: 'Plan', dataType: 'enum', sortable: true },
    { key: 'createdAt', header: 'Created', dataType: 'datetime', sortable: true },
  ];
}

function runMeasuredOperation(label, datasetSize, iterations, warmup, operation) {
  for (let run = 0; run < warmup; run += 1) {
    operation(run);
  }

  const start = performance.now();
  for (let run = 0; run < iterations; run += 1) {
    operation(run + warmup);
  }
  const durationMs = performance.now() - start;

  const opsPerSecond = (iterations / durationMs) * 1000;
  return {
    label,
    datasetSize,
    iterations,
    warmup,
    durationMs: Number(durationMs.toFixed(2)),
    avgMsPerRun: Number((durationMs / iterations).toFixed(3)),
    opsPerSecond: Number(opsPerSecond.toFixed(2)),
  };
}

function benchmarkForDataset(datasetSize) {
  const dataset = createDataset(datasetSize, 1337 + datasetSize);
  const columns = createColumns();

  return {
    datasetSize,
    operations: [
      (iterations, warmup) =>
        runMeasuredOperation('sorting', datasetSize, iterations, warmup, () => {
          const table = new JsonTableComponent({ data: dataset, columns, rowKey: 'id' });
          table.setSortRules([
            { columnKey: 'age', direction: 'desc' },
            { columnKey: 'name', direction: 'asc' },
          ]);
          table.getTableRows();
        }),
      (iterations, warmup) =>
        runMeasuredOperation('filtering', datasetSize, iterations, warmup, () => {
          const table = new JsonTableComponent({ data: dataset, columns, rowKey: 'id' });
          table.setFilters([
            { columnKey: 'active', operator: 'isTrue' },
            { columnKey: 'age', operator: 'gte', value: 35 },
            { columnKey: 'name', operator: 'contains', value: 'a' },
          ]);
          table.getTableRows();
        }),
      (iterations, warmup) =>
        runMeasuredOperation('pagination', datasetSize, iterations, warmup, (run) => {
          const table = new JsonTableComponent({ data: dataset, columns, rowKey: 'id' });
          table.setSortRules([{ columnKey: 'createdAt', direction: 'desc' }]);
          table.setPagination({ pageIndex: run % 5, pageSize: 50 });
          table.getTableRows();
        }),
      (iterations, warmup) =>
        runMeasuredOperation('selection', datasetSize, iterations, warmup, () => {
          const table = new JsonTableComponent({ data: dataset, columns, rowKey: 'id' });
          table.setFilters([{ columnKey: 'active', operator: 'isTrue' }]);
          table.setPagination({ pageIndex: 0, pageSize: 100 });
          table.selectAllFilteredRows();
          table.getSelectionInfo();
        }),
    ],
  };
}

function printTable(results) {
  const header = ['Operation', 'Dataset', 'Iterations', 'Total (ms)', 'Avg/Run (ms)', 'Ops/Sec'];
  const divider = '-'.repeat(86);
  console.log(header.join(' | '));
  console.log(divider);

  for (const row of results) {
    console.log(
      [
        row.label.padEnd(9, ' '),
        String(row.datasetSize).padStart(7, ' '),
        String(row.iterations).padStart(10, ' '),
        row.durationMs.toFixed(2).padStart(10, ' '),
        row.avgMsPerRun.toFixed(3).padStart(12, ' '),
        row.opsPerSecond.toFixed(2).padStart(10, ' '),
      ].join(' | ')
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const results = [];

  for (const size of args.sizes) {
    const datasetSuite = benchmarkForDataset(size);
    for (const operation of datasetSuite.operations) {
      results.push(operation(args.iterations, args.warmup));
    }
  }

  const report = {
    generatedAt: startedAt,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    config: {
      sizes: args.sizes,
      iterations: args.iterations,
      warmup: args.warmup,
    },
    results,
  };

  printTable(results);

  if (args.out != null) {
    const outputPath = path.resolve(process.cwd(), args.out);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`\nBenchmark JSON report written to ${outputPath}`);
  }
}

main();
