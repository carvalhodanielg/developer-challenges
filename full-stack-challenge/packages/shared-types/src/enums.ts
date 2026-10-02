export const MachineType = {
  Pump: 'Pump',
  Fan: 'Fan',
} as const;
export type MachineType = (typeof MachineType)[keyof typeof MachineType];

// Prisma can't name an enum value "HF+", so the DB stores the key (HFPlus)
// while the API and UI use the value ("HF+").
export const SensorModel = {
  TcAg: 'TcAg',
  TcAs: 'TcAs',
  HFPlus: 'HF+',
} as const;
export type SensorModel = (typeof SensorModel)[keyof typeof SensorModel];
