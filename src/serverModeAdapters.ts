import type { SortState, TableFilter, TablePaginationState, TableSortDirection } from './tableComponent';

export interface ServerSortRule {
  readonly field: string;
  readonly direction: TableSortDirection;
}

export interface ServerFilterRule {
  readonly field: string;
  readonly operator: string;
  readonly value?: unknown;
  readonly valueTo?: unknown;
  readonly caseSensitive?: boolean;
}

export interface ServerPaginationRequest {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface ServerTableRequest {
  readonly sort: readonly ServerSortRule[];
  readonly filters: readonly ServerFilterRule[];
  readonly pagination?: ServerPaginationRequest;
}

export function toServerSortRules(sortRules: readonly SortState[]): readonly ServerSortRule[] {
  return sortRules.map((rule) => ({
    field: rule.columnKey,
    direction: rule.direction,
  }));
}

export function toServerFilterRules<T extends Record<string, unknown>>(
  filters: readonly TableFilter<T>[]
): readonly ServerFilterRule[] {
  return filters.map((filter) => ({
    field: String(filter.columnKey),
    operator: filter.operator,
    value: filter.value,
    valueTo: filter.valueTo,
    caseSensitive: filter.caseSensitive,
  }));
}

export function toServerPaginationRequest(pagination: TablePaginationState): ServerPaginationRequest {
  return {
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  };
}

export function createServerTableRequest<T extends Record<string, unknown>>(input: {
  readonly sortRules?: readonly SortState[];
  readonly filters?: readonly TableFilter<T>[];
  readonly pagination?: TablePaginationState;
}): ServerTableRequest {
  return {
    sort: toServerSortRules(input.sortRules ?? []),
    filters: toServerFilterRules(input.filters ?? []),
    pagination: input.pagination == null ? undefined : toServerPaginationRequest(input.pagination),
  };
}