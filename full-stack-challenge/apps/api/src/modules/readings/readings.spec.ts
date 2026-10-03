import { MAX_READINGS_PER_REQUEST } from '@dynapredict/shared-types';
import request from 'supertest';
import { authCookie, resetDatabase, UNKNOWN_ID } from '../../../tests/helpers';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';

const app = createApp();
const cookie = authCookie();

function postReadings(sensorId: string, body: object) {
  return request(app)
    .post(`/api/v1/sensors/${sensorId}/readings`)
    .set('Cookie', cookie)
    .send(body);
}

/** A Fan machine with one point per serial number, each with an HF+ sensor. */
async function createSensors(...serialNumbers: string[]) {
  const machine = await prisma.machine.create({
    data: {
      name: 'Ventilador 01',
      type: 'Fan',
      monitoringPoints: {
        create: serialNumbers.map((serialNumber) => ({
          name: `Ponto ${serialNumber}`,
          sensor: { create: { serialNumber, model: 'HFPlus' } },
        })),
      },
    },
    select: { monitoringPoints: { select: { sensor: true } } },
  });
  return machine.monitoringPoints.map((point) => point.sensor!);
}

/** `count` readings one minute apart, starting at 2026-10-03T12:00Z. */
function series(count: number, start = Date.UTC(2026, 9, 3, 12)) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(start + i * 60_000).toISOString(),
    value: i + 0.5,
  }));
}

function storedReadings(sensorId: string) {
  return prisma.reading.findMany({
    where: { sensorId },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true, value: true },
  });
}

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /api/v1/sensors/:sensorId/readings', () => {
  it('requires a session', async () => {
    const res = await request(app)
      .post(`/api/v1/sensors/${UNKNOWN_ID}/readings`)
      .send({ readings: series(1) });

    expect(res.status).toBe(401);
  });

  it('stores a batch and reports what was inserted', async () => {
    const [sensor] = await createSensors('HFP-1');

    const res = await postReadings(sensor.id, {
      readings: [
        { timestamp: '2026-10-03T12:00:00Z', value: 1.25 },
        // Another offset: stored as 12:01 UTC.
        { timestamp: '2026-10-03T09:01:00-03:00', value: -3 },
        { timestamp: '2026-10-03T12:02:00.123Z', value: 0 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: 3, inserted: 3, duplicates: 0 });
    expect(await storedReadings(sensor.id)).toEqual([
      { timestamp: new Date('2026-10-03T12:00:00Z'), value: 1.25 },
      { timestamp: new Date('2026-10-03T12:01:00Z'), value: -3 },
      { timestamp: new Date('2026-10-03T12:02:00.123Z'), value: 0 },
    ]);
  });

  it('is idempotent: re-sending a batch inserts nothing and answers 200', async () => {
    const [sensor] = await createSensors('HFP-1');
    await postReadings(sensor.id, { readings: series(3) });

    const res = await postReadings(sensor.id, { readings: series(3) });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: 3, inserted: 0, duplicates: 3 });
    expect(await prisma.reading.count()).toBe(3);
  });

  it('inserts only the new readings of an overlapping batch, keeping the stored values', async () => {
    const [sensor] = await createSensors('HFP-1');
    await postReadings(sensor.id, { readings: series(2) });

    const overlapping = series(3).map((reading) => ({
      ...reading,
      value: 99,
    }));
    const res = await postReadings(sensor.id, { readings: overlapping });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: 3, inserted: 1, duplicates: 2 });
    expect((await storedReadings(sensor.id)).map((r) => r.value)).toEqual([
      0.5, 1.5, 99,
    ]);
  });

  it('counts repeated instants inside one batch as duplicates', async () => {
    const [sensor] = await createSensors('HFP-1');

    const res = await postReadings(sensor.id, {
      readings: [
        { timestamp: '2026-10-03T12:00:00Z', value: 1 },
        { timestamp: '2026-10-03T12:00:00+00:00', value: 2 },
      ],
    });

    expect(res.body).toEqual({ received: 2, inserted: 1, duplicates: 1 });
  });

  it('lets different sensors have readings at the same instant', async () => {
    const [first, second] = await createSensors('HFP-1', 'HFP-2');

    await postReadings(first.id, { readings: series(2) });
    const res = await postReadings(second.id, { readings: series(2) });

    expect(res.body.inserted).toBe(2);
    expect(await prisma.reading.count()).toBe(4);
  });

  it(`accepts a full batch of ${MAX_READINGS_PER_REQUEST} readings`, async () => {
    const [sensor] = await createSensors('HFP-1');

    const res = await postReadings(sensor.id, {
      readings: series(MAX_READINGS_PER_REQUEST),
    });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(MAX_READINGS_PER_REQUEST);
  });

  it('returns 404 for an unknown sensor and stores nothing', async () => {
    const res = await postReadings(UNKNOWN_ID, { readings: series(2) });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Sensor not found');
    expect(await prisma.reading.count()).toBe(0);
  });

  it.each([
    ['an empty batch', { readings: [] }],
    ['a missing readings field', {}],
    [
      `more than ${MAX_READINGS_PER_REQUEST} readings`,
      { readings: series(MAX_READINGS_PER_REQUEST + 1) },
    ],
    [
      'a timestamp without offset',
      { readings: [{ timestamp: '2026-10-03T12:00:00', value: 1 }] },
    ],
    [
      'a timestamp that is not a date',
      { readings: [{ timestamp: 'yesterday', value: 1 }] },
    ],
    [
      'a numeric string value',
      { readings: [{ timestamp: '2026-10-03T12:00:00Z', value: '1' }] },
    ],
    [
      'a null value',
      { readings: [{ timestamp: '2026-10-03T12:00:00Z', value: null }] },
    ],
  ])('rejects %s with 400', async (_, body) => {
    const [sensor] = await createSensors('HFP-1');

    const res = await postReadings(sensor.id, body);

    expect(res.status).toBe(400);
    expect(await prisma.reading.count()).toBe(0);
  });

  it('rejects a whole batch when any reading is invalid', async () => {
    const [sensor] = await createSensors('HFP-1');

    const res = await postReadings(sensor.id, {
      readings: [...series(2), { timestamp: 'bad', value: 1 }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ path: 'readings.2.timestamp' }),
    ]);
    expect(await prisma.reading.count()).toBe(0);
  });

  it('rejects a sensor id that is not a uuid with 400', async () => {
    const res = await postReadings('42', { readings: series(1) });

    expect(res.status).toBe(400);
  });
});
