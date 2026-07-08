import { JsonTableComponent } from './tableComponent';
import type {
  JsonTableComponentOptions,
  TableActionColumn,
  TableColumn,
  TableRowKey,
  TableTelemetryEvent,
} from './tableComponent';

export type TableRowShape = Record<string, unknown>;
export type TableRowField<TRow extends TableRowShape> = Extract<keyof TRow, string>;

export type ColumnBuilderOptions<TRow extends TableRowShape> = Omit<TableColumn<TRow>, 'key' | 'header' | 'dataType'>;

export interface ColumnSchemaBuilder<TRow extends TableRowShape> {
  text<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  number<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  decimal<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  currency<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  date<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  datetime<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  boolean<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
  enum<K extends TableRowField<TRow>>(key: K, header: string, options?: ColumnBuilderOptions<TRow>): TableColumn<TRow>;
}

function createColumn<TRow extends TableRowShape>(
  key: TableRowField<TRow>,
  header: string,
  dataType: TableColumn<TRow>['dataType'],
  options: ColumnBuilderOptions<TRow> | undefined
): TableColumn<TRow> {
  return {
    key,
    header,
    dataType,
    accessor: options?.accessor ?? ((row: TRow): unknown => row[key]),
    ...options,
  };
}

export function createColumnSchemaBuilder<TRow extends TableRowShape>(): ColumnSchemaBuilder<TRow> {
  return {
    text: (key, header, options) => createColumn(key, header, 'text', options),
    number: (key, header, options) => createColumn(key, header, 'number', options),
    decimal: (key, header, options) => createColumn(key, header, 'decimal', options),
    currency: (key, header, options) => createColumn(key, header, 'currency', options),
    date: (key, header, options) => createColumn(key, header, 'date', options),
    datetime: (key, header, options) => createColumn(key, header, 'datetime', options),
    boolean: (key, header, options) => createColumn(key, header, 'boolean', options),
    enum: (key, header, options) => createColumn(key, header, 'enum', options),
  };
}

export function defineTableColumns<TRow extends TableRowShape, TColumns extends readonly TableColumn<TRow>[]>(
  ...columns: TColumns
): TColumns {
  return columns;
}

export interface TypedTableOptions<TRow extends TableRowShape, TColumns extends readonly TableColumn<TRow>[]> {
  readonly data: string | readonly TRow[];
  readonly columns: TColumns;
  readonly actionColumn?: TableActionColumn<TRow>;
  readonly rowKey?: TableRowField<TRow> | ((row: TRow, index: number) => TableRowKey);
  readonly telemetry?: (event: TableTelemetryEvent<TRow>) => void | Promise<void>;
}

export function createTypedTableOptions<TRow extends TableRowShape, TColumns extends readonly TableColumn<TRow>[]>(
  options: TypedTableOptions<TRow, TColumns>
): JsonTableComponentOptions<TRow> {
  return options;
}

export function createTypedTableComponent<TRow extends TableRowShape, TColumns extends readonly TableColumn<TRow>[]>(
  options: TypedTableOptions<TRow, TColumns>
): JsonTableComponent<TRow> {
  return new JsonTableComponent(createTypedTableOptions(options));
}
