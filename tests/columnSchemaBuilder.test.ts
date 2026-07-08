import { describe, expect, it } from 'vitest';
import {
  createColumnSchemaBuilder,
  createTypedTableComponent,
  createTypedTableOptions,
  defineTableColumns,
} from '../src/index';

type UserRow = {
  id: string;
  fullName: string;
  age: number;
  score: number;
  amount: number;
  createdAt: string;
  active: boolean;
  role: 'admin' | 'user';
};

describe('columnSchemaBuilder', () => {
  it('builds schema-driven columns with defaults', () => {
    const schema = createColumnSchemaBuilder<UserRow>();
    const columns = defineTableColumns(
      schema.text('fullName', 'Full Name', { sortable: true }),
      schema.number('age', 'Age', { sortable: true }),
      schema.boolean('active', 'Active'),
      schema.enum('role', 'Role')
    );

    expect(columns.map((column) => column.key)).toEqual(['fullName', 'age', 'active', 'role']);
    expect(columns[0]?.dataType).toBe('text');
    expect(columns[1]?.dataType).toBe('number');
    expect(columns[0]?.sortable).toBe(true);
  });

  it('creates strongly-typed table options and component from schema', () => {
    const schema = createColumnSchemaBuilder<UserRow>();
    const data: readonly UserRow[] = [
      { id: 'u1', fullName: 'Alice Doe', age: 31, active: true, role: 'admin' },
      { id: 'u2', fullName: 'Bob Roe', age: 24, active: false, role: 'user' },
    ];

    const hydratedData = data.map((row, index) => ({
      ...row,
      score: index === 0 ? 9.25 : 7.1,
      amount: index === 0 ? 100.5 : 42.2,
      createdAt: index === 0 ? '2026-01-02T10:00:00.000Z' : '2026-01-01T10:00:00.000Z',
    }));

    const columns = defineTableColumns(
      schema.text('fullName', 'Full Name', { sortable: true }),
      schema.number('age', 'Age', { sortable: true }),
      schema.decimal('score', 'Score', { decimalPlaces: 2 }),
      schema.currency('amount', 'Amount', { currencyCode: 'USD' }),
      schema.date('createdAt', 'Created'),
      schema.datetime('createdAt', 'Created At'),
      schema.boolean('active', 'Active', { accessor: (row) => row.active })
    );

    const customHeaderColumns = defineTableColumns(
      schema.text('fullName', 'Custom Full Name', {
        accessor: (row) => `${row.fullName} (${row.role})`,
      })
    );

    expect(customHeaderColumns[0]?.header).toBe('Custom Full Name');
    expect(customHeaderColumns[0]?.accessor?.(hydratedData[0])).toContain('Alice Doe');

    const options = createTypedTableOptions({
      data: hydratedData,
      columns,
      rowKey: 'id',
      telemetry: () => {},
    });

    expect(options.rowKey).toBe('id');

    const table = createTypedTableComponent(options);
    table.setSortRules([{ columnKey: 'age', direction: 'desc' }]);

    const rows = table.getTableRows();
    expect(rows[0]?.cells[0]?.displayValue).toBe('Alice Doe');
    expect(rows[1]?.cells[0]?.displayValue).toBe('Bob Roe');
  });
});
