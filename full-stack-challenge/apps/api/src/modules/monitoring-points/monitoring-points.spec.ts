import request from 'supertest';
import { authCookie, resetDatabase, UNKNOWN_ID } from '../../../tests/helpers';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';

const app = createApp();
const cookie = authCookie();

function createPoint(machineId: string, body: object) {
  return request(app)
    .post(`/api/v1/machines/${machineId}/monitoring-points`)
    .set('Cookie', cookie)
    .send(body);
}

function updatePoint(id: string, body: object) {
  return request(app)
    .put(`/api/v1/monitoring-points/${id}`)
    .set('Cookie', cookie)
    .send(body);
}

function deletePoint(id: string) {
  return request(app)
    .delete(`/api/v1/monitoring-points/${id}`)
    .set('Cookie', cookie);
}

function createMachine() {
  return prisma.machine.create({ data: { name: 'Bomba 01', type: 'Pump' } });
}

/** A point on a new machine, with an HF+ sensor that has one reading. */
async function pointWithSensorAndReading() {
  const machine = await createMachine();
  const point = await prisma.monitoringPoint.create({
    data: {
      name: 'Mancal',
      machineId: machine.id,
      sensor: { create: { serialNumber: 'HFP-1', model: 'HFPlus' } },
    },
    include: { sensor: true },
  });
  await prisma.reading.create({
    data: { sensorId: point.sensor!.id, timestamp: new Date(), value: 2 },
  });
  return { machine, point };
}

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('monitoring point routes', () => {
  it.each([
    ['POST', `/api/v1/machines/${UNKNOWN_ID}/monitoring-points`],
    ['PUT', `/api/v1/monitoring-points/${UNKNOWN_ID}`],
    ['DELETE', `/api/v1/monitoring-points/${UNKNOWN_ID}`],
  ])('%s %s requires a session', async (method, path) => {
    const res =
      await request(app)[method.toLowerCase() as 'post' | 'put' | 'delete'](
        path,
      );

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/machines/:machineId/monitoring-points', () => {
  it('creates a point without a sensor', async () => {
    const machine = await createMachine();

    const res = await createPoint(machine.id, { name: '  Mancal dianteiro ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Mancal dianteiro',
      machineId: machine.id,
      sensor: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('allows several points on the same machine', async () => {
    const machine = await createMachine();

    await createPoint(machine.id, { name: 'Mancal dianteiro' });
    await createPoint(machine.id, { name: 'Mancal traseiro' });

    expect(
      await prisma.monitoringPoint.count({ where: { machineId: machine.id } }),
    ).toBe(2);
  });

  it('returns 404 when the machine does not exist', async () => {
    const res = await createPoint(UNKNOWN_ID, { name: 'Mancal' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Machine not found');
  });

  it.each([
    ['an empty name', { name: '  ' }],
    ['a name over 100 characters', { name: 'x'.repeat(101) }],
    ['a missing name', {}],
  ])('rejects %s with 400', async (_, body) => {
    const machine = await createMachine();

    const res = await createPoint(machine.id, body);

    expect(res.status).toBe(400);
    expect(await prisma.monitoringPoint.count()).toBe(0);
  });

  it('rejects a machine id that is not a uuid with 400', async () => {
    const res = await createPoint('42', { name: 'Mancal' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/monitoring-points/:id', () => {
  it('renames the point and keeps its sensor', async () => {
    const { point } = await pointWithSensorAndReading();

    const res = await updatePoint(point.id, { name: 'Mancal traseiro' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: point.id,
      name: 'Mancal traseiro',
      sensor: { serialNumber: 'HFP-1', model: 'HF+' },
    });
  });

  it('ignores an attempt to move the point to another machine', async () => {
    const { machine, point } = await pointWithSensorAndReading();
    const other = await createMachine();

    const res = await updatePoint(point.id, {
      name: 'Mancal',
      machineId: other.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.machineId).toBe(machine.id);
  });

  it('returns 404 for an unknown point', async () => {
    const res = await updatePoint(UNKNOWN_ID, { name: 'Mancal' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Monitoring point not found');
  });

  it('rejects an invalid body with 400', async () => {
    const { point } = await pointWithSensorAndReading();

    const res = await updatePoint(point.id, { name: '' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/monitoring-points/:id', () => {
  it('deletes the point with its sensor and readings, keeping the machine', async () => {
    const { machine, point } = await pointWithSensorAndReading();

    const res = await deletePoint(point.id);

    expect(res.status).toBe(204);
    expect(await prisma.monitoringPoint.count()).toBe(0);
    expect(await prisma.sensor.count()).toBe(0);
    expect(await prisma.reading.count()).toBe(0);
    expect(await prisma.machine.count({ where: { id: machine.id } })).toBe(1);
  });

  it('returns 404 for an unknown point', async () => {
    const res = await deletePoint(UNKNOWN_ID);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Monitoring point not found');
  });
});
