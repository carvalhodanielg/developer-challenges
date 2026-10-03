import type {
  CreateReadingsResultDto,
  ReadingsPageDto,
} from '@dynapredict/shared-types';
import { AppError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';
import { isForeignKeyViolation } from '../../lib/prismaErrors';
import type { CreateReadingsBody, ListReadingsQuery } from './readings.schemas';

async function assertSensorExists(sensorId: string): Promise<void> {
  const sensor = await prisma.sensor.findUnique({
    where: { id: sensorId },
    select: { id: true },
  });
  if (!sensor) throw AppError.notFound('Sensor not found');
}

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

/**
 * One page of a sensor's series, oldest first. Paging is keyset on the
 * timestamp (unique per sensor), so every page is an index range scan no
 * matter how deep it is, unlike OFFSET.
 */
export async function listReadings(
  sensorId: string,
  query: ListReadingsQuery,
): Promise<ReadingsPageDto> {
  const rows = await prisma.reading.findMany({
    where: {
      sensorId,
      timestamp: { gte: query.from, lte: query.to, gt: query.after },
    },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true, value: true },
    // One extra row tells whether another page exists.
    take: query.limit + 1,
  });
  // Rows prove the sensor exists; only an empty page needs the extra query.
  if (rows.length === 0) await assertSensorExists(sensorId);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  return {
    data: page.map((row) => ({
      timestamp: row.timestamp.toISOString(),
      value: row.value,
    })),
    meta: {
      limit: query.limit,
      nextCursor: hasMore
        ? page[page.length - 1].timestamp.toISOString()
        : null,
    },
  };
}
