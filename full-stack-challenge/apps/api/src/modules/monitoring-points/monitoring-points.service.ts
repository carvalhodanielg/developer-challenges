import {
  type MonitoringPointDto,
  sensorModelFromKey,
} from '@dynapredict/shared-types';
import { AppError } from '../../errors/AppError';
import { orNotFound } from '../../lib/prismaErrors';
import { prisma } from '../../lib/prisma';
import type { MonitoringPointInput } from './monitoring-points.schemas';

const monitoringPointSelect = {
  id: true,
  name: true,
  machineId: true,
  createdAt: true,
  updatedAt: true,
  sensor: {
    select: {
      id: true,
      serialNumber: true,
      model: true,
      monitoringPointId: true,
      createdAt: true,
    },
  },
} as const;

type MonitoringPointRow = Awaited<
  ReturnType<
    typeof prisma.monitoringPoint.findFirstOrThrow<{
      select: typeof monitoringPointSelect;
    }>
  >
>;

function toMonitoringPointDto(row: MonitoringPointRow): MonitoringPointDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sensor: row.sensor && {
      ...row.sensor,
      model: sensorModelFromKey(row.sensor.model),
      createdAt: row.sensor.createdAt.toISOString(),
    },
  };
}

export async function createMonitoringPoint(
  machineId: string,
  input: MonitoringPointInput,
): Promise<MonitoringPointDto> {
  // `connect` fails with P2025 if the machine is gone, including when it is
  // deleted concurrently, so there's no window for a dangling foreign key.
  const row = await orNotFound(
    prisma.monitoringPoint.create({
      data: { name: input.name, machine: { connect: { id: machineId } } },
      select: monitoringPointSelect,
    }),
    'Machine not found',
  );
  return toMonitoringPointDto(row);
}

/** Renames a point. Moving it to another machine is not supported. */
export async function updateMonitoringPoint(
  id: string,
  input: MonitoringPointInput,
): Promise<MonitoringPointDto> {
  const row = await orNotFound(
    prisma.monitoringPoint.update({
      where: { id },
      data: { name: input.name },
      select: monitoringPointSelect,
    }),
    'Monitoring point not found',
  );
  return toMonitoringPointDto(row);
}

/** Deletes the point; the database cascades to its sensor and readings. */
export async function deleteMonitoringPoint(id: string): Promise<void> {
  const { count } = await prisma.monitoringPoint.deleteMany({ where: { id } });
  if (count === 0) throw AppError.notFound('Monitoring point not found');
}
