import { SensorModel } from '@dynapredict/shared-types';
import { z } from 'zod';

export const pointIdParams = z.object({ pointId: z.uuid() });
export const sensorIdParams = z.object({ id: z.uuid() });

export const attachSensorSchema = z.object({
  // The label printed on the physical sensor.
  serialNumber: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'only letters, digits, dot, dash and underscore',
    ),
  // API values: "TcAg" | "TcAs" | "HF+".
  model: z.enum(SensorModel),
});

export type AttachSensorInput = z.infer<typeof attachSensorSchema>;
