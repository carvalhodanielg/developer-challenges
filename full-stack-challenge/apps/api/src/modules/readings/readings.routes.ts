import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import * as readingsController from './readings.controller';
import { createReadingsSchema, sensorIdParams } from './readings.schemas';

/** Mounted at /sensors/:sensorId/readings (needs the parent param). */
export const sensorReadingsRoutes = Router({ mergeParams: true });

sensorReadingsRoutes.post(
  '/',
  validate(sensorIdParams, 'params'),
  validate(createReadingsSchema),
  readingsController.create,
);
