import { z } from 'zod';

export const monitoringPointIdParams = z.object({ id: z.uuid() });
export const machineIdParams = z.object({ machineId: z.uuid() });

export const monitoringPointInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type MonitoringPointInput = z.infer<typeof monitoringPointInputSchema>;
