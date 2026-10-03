import type { CreateReadingsResultDto } from '@dynapredict/shared-types';
import { AppError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';
import { isForeignKeyViolation } from '../../lib/prismaErrors';
import type { CreateReadingsBody } from './readings.schemas';

/**
 * Bulk-inserts a sensor's readings in one statement. A reading whose
 * timestamp the sensor already has is skipped (unique (sensorId, timestamp)),
 * so retrying a batch never duplicates data.
 */
export async function createReadings(
  sensorId: string,
  input: CreateReadingsBody,
): Promise<CreateReadingsResultDto> {
  try {
    const { count } = await prisma.reading.createMany({
      data: input.readings.map(({ timestamp, value }) => ({
        sensorId,
        timestamp,
        value,
      })),
      skipDuplicates: true,
    });
    const received = input.readings.length;
    return { received, inserted: count, duplicates: received - count };
  } catch (error) {
    // The foreign key covers both an unknown id and a sensor removed
    // concurrently, without a separate existence query.
    if (isForeignKeyViolation(error)) {
      throw AppError.notFound('Sensor not found');
    }
    throw error;
  }
}
