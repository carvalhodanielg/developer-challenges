import type { ReadingsCountDto } from '@dynapredict/shared-types';
import { apiClient } from './apiClient';

/** How many readings a sensor has stored. */
export async function countReadings(sensorId: string): Promise<number> {
  const { data } = await apiClient.get<ReadingsCountDto>(
    `/sensors/${sensorId}/readings/count`,
  );
  return data.count;
}
