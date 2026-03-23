import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@app/store';

export const AppProviders = ({ children }: PropsWithChildren) => (
  <Provider store={store}>
    <Toaster position="top-right" reverseOrder />
    {children}
  </Provider>
);
