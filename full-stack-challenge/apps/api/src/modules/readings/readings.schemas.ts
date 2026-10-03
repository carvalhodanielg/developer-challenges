import { MAX_READINGS_PER_REQUEST } from '@dynapredict/shared-types';
import { z } from 'zod';

export const sensorIdParams = z.object({ sensorId: z.uuid() });

const readingSchema = z.object({
  // An explicit offset (or Z) avoids guessing the client's timezone.
  timestamp: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  // z.number() already rejects NaN and ±Infinity.
  value: z.number(),
});

export const createReadingsSchema = z.object({
  readings: z.array(readingSchema).min(1).max(MAX_READINGS_PER_REQUEST),
});

export type CreateReadingsBody = z.infer<typeof createReadingsSchema>;
