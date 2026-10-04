import type { Request, Response } from 'express';
import type {
  CountReadingsQuery,
  CreateReadingsBody,
  ListReadingsQuery,
} from './readings.schemas';
import * as readingsService from './readings.service';

// Params, query and body were already parsed by validate() in the routes.

export async function list(req: Request<{ sensorId: string }>, res: Response) {
  res.json(
    await readingsService.listReadings(
      req.params.sensorId,
      req.query as unknown as ListReadingsQuery,
    ),
  );
}

export async function count(req: Request<{ sensorId: string }>, res: Response) {
  res.json(
    await readingsService.countReadings(
      req.params.sensorId,
      req.query as unknown as CountReadingsQuery,
    ),
  );
}

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
