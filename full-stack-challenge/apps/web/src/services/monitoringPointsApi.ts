import type {
  MonitoringPointListItemDto,
  MonitoringPointSortField,
  Paginated,
  SortDirection,
} from '@dynapredict/shared-types';
import { apiClient } from './apiClient';

export interface MonitoringPointsQuery {
  page: number;
  pageSize: number;
  sortBy: MonitoringPointSortField;
  sortDir: SortDirection;
}

/** Every point across all machines, one server-sorted page at a time. */
export async function listMonitoringPoints(
  query: MonitoringPointsQuery,
): Promise<Paginated<MonitoringPointListItemDto>> {
  const { data } = await apiClient.get<Paginated<MonitoringPointListItemDto>>(
    '/monitoring-points',
    { params: query },
  );
  return data;
}
