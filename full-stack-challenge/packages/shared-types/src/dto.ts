import type { MachineType, SensorModel } from './enums';

// Dates travel as ISO 8601 strings.

export type SortDirection = 'asc' | 'desc';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SensorDto {
  id: string;
  serialNumber: string;
  model: SensorModel;
  monitoringPointId: string;
  createdAt: string;
}

export interface MonitoringPointSummaryDto {
  id: string;
  name: string;
  sensor: SensorDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringPointDto extends MonitoringPointSummaryDto {
  machineId: string;
}

/** A row of the global monitoring points listing, with its machine inlined. */
export interface MonitoringPointListItemDto extends MonitoringPointSummaryDto {
  machine: Pick<MachineDto, 'id' | 'name' | 'type'>;
}

export const MONITORING_POINT_SORT_FIELDS = [
  'machineName',
  'machineType',
  'pointName',
  'sensorModel',
] as const;
export type MonitoringPointSortField =
  (typeof MONITORING_POINT_SORT_FIELDS)[number];

export interface MonitoringPointInput {
  name: string;
}

export interface MachineDto {
  id: string;
  name: string;
  type: MachineType;
  monitoringPointsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MachineDetailDto extends Omit<
  MachineDto,
  'monitoringPointsCount'
> {
  monitoringPoints: MonitoringPointSummaryDto[];
}

export interface MachineInput {
  name: string;
  type: MachineType;
}

export const MACHINE_SORT_FIELDS = ['name', 'type', 'createdAt'] as const;
export type MachineSortField = (typeof MACHINE_SORT_FIELDS)[number];

/**
 * Upper bound for one POST /sensors/:id/readings, sized to keep each request
 * under the 350 ms latency budget. Larger uploads are sent in chunks.
 */
export const MAX_READINGS_PER_REQUEST = 1000;

export interface ReadingInput {
  /** ISO 8601 with an explicit offset, e.g. 2026-10-03T12:00:00Z. */
  timestamp: string;
  value: number;
}

export interface CreateReadingsInput {
  readings: ReadingInput[];
}

export interface CreateReadingsResultDto {
  received: number;
  inserted: number;
  /** Readings skipped because the sensor already had one at that timestamp. */
  duplicates: number;
}

export const DEFAULT_READINGS_PAGE_SIZE = 1000;
export const MAX_READINGS_PAGE_SIZE = 5000;

export interface ReadingDto {
  timestamp: string;
  value: number;
}

/**
 * A page of a sensor's series in ascending time. Pass `nextCursor` as `after`
 * to get the next page; it is null on the last one.
 */
export interface ReadingsPageDto {
  data: ReadingDto[];
  meta: { limit: number; nextCursor: string | null };
}

export interface ReadingsCountDto {
  count: number;
}

/**
 * Aggregates of a sensor's series (or of a range of it). Everything but
 * `count` is null when there are no readings: an average of 0 would be a lie.
 */
export interface ReadingsMetricsDto {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
}
