import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { AppError } from '../errors/AppError';
import { errorHandler } from './errorHandler';

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('prisma failure', {
    code,
    clientVersion: 'test',
    meta,
  });
}

/** Builds an app whose only route fails with `error`, behind the real handler. */
function appThrowing(error: unknown) {
  const app = express();
  app.use(express.json());
  app.post('/boom', () => {
    throw error;
  });
  app.post('/async-boom', async () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('responds with the status, code and message of an AppError', async () => {
    const res = await request(
      appThrowing(AppError.notFound('Machine not found')),
    ).post('/boom');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Machine not found' },
    });
  });

  it('includes details when the AppError carries them', async () => {
    const error = AppError.unprocessable('Sensor not allowed on Pump', {
      machineType: 'Pump',
      sensorModel: 'TcAg',
    });

    const res = await request(appThrowing(error)).post('/boom');

    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'Sensor not allowed on Pump',
      details: { machineType: 'Pump', sensorModel: 'TcAg' },
    });
  });

  it('handles errors thrown from async handlers', async () => {
    const res = await request(appThrowing(AppError.conflict('Duplicate'))).post(
      '/async-boom',
    );

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('maps a ZodError to 400 with one entry per issue', async () => {
    const result = z
      .object({ name: z.string(), page: z.number().int() })
      .safeParse({ page: 1.5 });
    if (result.success) throw new Error('expected the schema to fail');

    const res = await request(appThrowing(result.error)).post('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([
      { path: 'name', message: expect.any(String) },
      { path: 'page', message: expect.any(String) },
    ]);
  });

  it('maps Prisma P2025 (record not found) to 404', async () => {
    const res = await request(appThrowing(prismaError('P2025'))).post('/boom');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('maps Prisma P2002 (unique constraint) to 409 with the fields', async () => {
    const res = await request(
      appThrowing(prismaError('P2002', { target: ['serialNumber'] })),
    ).post('/boom');

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'CONFLICT',
      message: 'Resource already exists',
      details: { fields: ['serialNumber'] },
    });
  });

  it('maps a malformed JSON body to 400', async () => {
    const res = await request(appThrowing(new Error('unreachable')))
      .post('/boom')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  describe('unexpected errors', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it.each([
      ['a generic Error', new Error('database password is hunter2')],
      ['an unmapped Prisma code', prismaError('P2003')],
      ['a non-Error value', 'string thrown'],
    ])('responds 500 without leaking the cause for %s', async (_, error) => {
      const res = await request(appThrowing(error)).post('/boom');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
      expect(console.error).toHaveBeenCalledWith(error);
    });
  });
});
