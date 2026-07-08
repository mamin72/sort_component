import { describe, expect, it } from 'vitest';
import { createServerTableRequest, toServerFilterRules, toServerPaginationRequest, toServerSortRules } from '../src/index';

describe('serverModeAdapters', () => {
  it('maps sort rules deterministically to server sort request format', () => {
    const result = toServerSortRules([
      { columnKey: 'createdUtc', direction: 'desc' },
      { columnKey: 'name', direction: 'asc' },
    ]);

    expect(result).toEqual([
      { field: 'createdUtc', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);
  });

  it('maps filters deterministically to server filter request format', () => {
    const result = toServerFilterRules([
      { columnKey: 'name', operator: 'contains', value: 'ali' },
      { columnKey: 'age', operator: 'between', value: 18, valueTo: 30 },
      { columnKey: 'active', operator: 'eq', value: true, caseSensitive: false },
    ]);

    expect(result).toEqual([
      { field: 'name', operator: 'contains', value: 'ali', valueTo: undefined, caseSensitive: undefined },
      { field: 'age', operator: 'between', value: 18, valueTo: 30, caseSensitive: undefined },
      { field: 'active', operator: 'eq', value: true, valueTo: undefined, caseSensitive: false },
    ]);
  });

  it('maps pagination to offset/limit request shape', () => {
    expect(toServerPaginationRequest({ pageIndex: 2, pageSize: 25 })).toEqual({
      pageIndex: 2,
      pageSize: 25,
      offset: 50,
      limit: 25,
    });
  });

  it('builds full server request from table state and keeps empty defaults deterministic', () => {
    expect(
      createServerTableRequest({
        sortRules: [{ columnKey: 'name', direction: 'asc' }],
        filters: [{ columnKey: 'active', operator: 'eq', value: true }],
        pagination: { pageIndex: 0, pageSize: 20 },
      })
    ).toEqual({
      sort: [{ field: 'name', direction: 'asc' }],
      filters: [{ field: 'active', operator: 'eq', value: true, valueTo: undefined, caseSensitive: undefined }],
      pagination: { pageIndex: 0, pageSize: 20, offset: 0, limit: 20 },
    });

    expect(createServerTableRequest({})).toEqual({
      sort: [],
      filters: [],
      pagination: undefined,
    });
  });
});