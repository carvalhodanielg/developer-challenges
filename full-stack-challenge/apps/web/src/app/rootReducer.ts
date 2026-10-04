import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/authSlice';
import { uiReducer } from '../features/ui/uiSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
