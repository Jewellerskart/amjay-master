import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '@api/apiSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (defaultMiddleware) =>
    defaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});
