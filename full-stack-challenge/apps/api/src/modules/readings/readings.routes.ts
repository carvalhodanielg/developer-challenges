import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import * as readingsController from './readings.controller';
import {
  countReadingsQuery,
  createReadingsSchema,
  listReadingsQuery,
  sensorIdParams,
} from './readings.schemas';

/** Mounted at /sensors/:sensorId/readings (needs the parent param). */
export const sensorReadingsRoutes = Router({ mergeParams: true });

sensorReadingsRoutes.get(
  '/',
  validate(sensorIdParams, 'params'),
  validate(listReadingsQuery, 'query'),
  readingsController.list,
);
sensorReadingsRoutes.get(
  '/count',
  validate(sensorIdParams, 'params'),
  validate(countReadingsQuery, 'query'),
  readingsController.count,
);
sensorReadingsRoutes.post(
  '/',
  validate(sensorIdParams, 'params'),
  validate(createReadingsSchema),
  readingsController.create,
);
