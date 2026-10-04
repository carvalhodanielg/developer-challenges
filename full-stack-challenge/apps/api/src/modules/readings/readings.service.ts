import type {
  CreateReadingsResultDto,
  ReadingsCountDto,
  ReadingsMetricsDto,
  ReadingsPageDto,
} from '@dynapredict/shared-types';
import { AppError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';
import { isForeignKeyViolation } from '../../lib/prismaErrors';
import type {
  TimeRangeQuery,
  CreateReadingsBody,
  ListReadingsQuery,
} from './readings.schemas';

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

/** How many readings the sensor has, optionally within an inclusive range. */
export async function countReadings(
  sensorId: string,
  query: TimeRangeQuery,
): Promise<ReadingsCountDto> {
  const count = await prisma.reading.count({
    where: { sensorId, timestamp: { gte: query.from, lte: query.to } },
  });
  // A non-zero count proves the sensor exists; zero is ambiguous.
  if (count === 0) await assertSensorExists(sensorId);
  return { count };
}

/** Min, max and average of the values in one aggregate query. */
export async function getReadingsMetrics(
  sensorId: string,
  query: TimeRangeQuery,
): Promise<ReadingsMetricsDto> {
  const result = await prisma.reading.aggregate({
    where: { sensorId, timestamp: { gte: query.from, lte: query.to } },
    _count: { _all: true },
    _min: { value: true, timestamp: true },
    _max: { value: true, timestamp: true },
    _avg: { value: true },
  });
  const count = result._count._all;
  if (count === 0) await assertSensorExists(sensorId);
  return {
    count,
    min: result._min.value,
    max: result._max.value,
    avg: result._avg.value,
    firstTimestamp: result._min.timestamp?.toISOString() ?? null,
    lastTimestamp: result._max.timestamp?.toISOString() ?? null,
  };
}
