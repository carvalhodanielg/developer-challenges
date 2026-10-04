import {
  DEFAULT_READINGS_PAGE_SIZE,
  MAX_READINGS_PAGE_SIZE,
  MAX_READINGS_PER_REQUEST,
} from '@dynapredict/shared-types';
import { z } from 'zod';

export const sensorIdParams = z.object({ sensorId: z.uuid() });

// An explicit offset (or Z) avoids guessing the client's timezone.
const instant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const readingSchema = z.object({
  timestamp: instant,
  // z.number() already rejects NaN and ±Infinity.
  value: z.number(),
});

export const createReadingsSchema = z.object({
  readings: z.array(readingSchema).min(1).max(MAX_READINGS_PER_REQUEST),
});

export type CreateReadingsBody = z.infer<typeof createReadingsSchema>;

/** `?from&to`, both inclusive and optional. Shared by the readings queries. */
const timeRangeShape = {
  from: instant.optional(),
  to: instant.optional(),
};

function isOrderedRange(range: { from?: Date; to?: Date }) {
  return !range.from || !range.to || range.from <= range.to;
}

const unorderedRange = {
  message: 'from must not be after to',
  path: ['from'],
};

export const listReadingsQuery = z
  .object({
    ...timeRangeShape,
    // Keyset cursor: the nextCursor of the previous page (exclusive).
    after: instant.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_READINGS_PAGE_SIZE)
      .default(DEFAULT_READINGS_PAGE_SIZE),
  })
  .refine(isOrderedRange, unorderedRange);

export type ListReadingsQuery = z.infer<typeof listReadingsQuery>;

export const countReadingsQuery = z
  .object(timeRangeShape)
  .refine(isOrderedRange, unorderedRange);

export type CountReadingsQuery = z.infer<typeof countReadingsQuery>;
