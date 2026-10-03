import type { Request, Response } from 'express';
import type { CreateReadingsBody } from './readings.schemas';
import * as readingsService from './readings.service';

// Params and body were already parsed by validate() in the routes.

export async function create(
  req: Request<{ sensorId: string }>,
  res: Response,
) {
  const result = await readingsService.createReadings(
    req.params.sensorId,
    req.body as CreateReadingsBody,
  );
  // A batch made only of duplicates created nothing.
  res.status(result.inserted > 0 ? 201 : 200).json(result);
}
