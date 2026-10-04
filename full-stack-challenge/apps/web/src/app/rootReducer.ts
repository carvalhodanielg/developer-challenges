import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/authSlice';
import { machinesReducer } from '../features/machines/machinesSlice';
import { uiReducer } from '../features/ui/uiSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  machines: machinesReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
