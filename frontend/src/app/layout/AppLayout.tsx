import type { PropsWithChildren } from 'react';
import { Footer } from '@common/footer';

export const AppLayout = ({ children }: PropsWithChildren) => (
  <div id="main-wrapper">
    {children}
    <Footer />
  </div>
);
