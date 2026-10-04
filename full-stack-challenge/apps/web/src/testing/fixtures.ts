import type { MachineDto, Paginated } from '@dynapredict/shared-types';

export function aMachine(overrides: Partial<MachineDto> = {}): MachineDto {
  return {
    id: 'm-1',
    name: 'Pump 01',
    type: 'Pump',
    monitoringPointsCount: 2,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

export function aPage<T>(
  data: T[],
  meta: Partial<Paginated<T>['meta']> = {},
): Paginated<T> {
  return {
    data,
    meta: { page: 1, pageSize: 10, total: data.length, totalPages: 1, ...meta },
  };
}

/** A promise the test resolves by hand, to order concurrent responses. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
