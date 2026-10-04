import { configureStore } from '@reduxjs/toolkit';
import { persistColorMode } from '../features/ui/uiSlice';
import { rootReducer, type RootState } from './rootReducer';

/**
 * Builds a store. Tests call it with a preloaded state to start from a known
 * point; the app uses the singleton below.
 */
export function setupStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({ reducer: rootReducer, preloadedState });

  // Persist the colour mode only when it changes, not on every action.
  let colorMode = store.getState().ui.colorMode;
  store.subscribe(() => {
    const next = store.getState().ui.colorMode;
    if (next !== colorMode) {
      colorMode = next;
      persistColorMode(next);
    }
  });

  return store;
}

export const store = setupStore();

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
export type { RootState };
