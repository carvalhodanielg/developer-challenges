import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/authSlice';
import { machineDetailReducer } from '../features/machines/machineDetailSlice';
import { machinesReducer } from '../features/machines/machinesSlice';
import { monitoringPointsReducer } from '../features/monitoringPoints/monitoringPointsSlice';
import { uiReducer } from '../features/ui/uiSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  machineDetail: machineDetailReducer,
  machines: machinesReducer,
  monitoringPoints: monitoringPointsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
