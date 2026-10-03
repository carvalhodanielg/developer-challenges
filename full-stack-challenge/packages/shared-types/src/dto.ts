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
