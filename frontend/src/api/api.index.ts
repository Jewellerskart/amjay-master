import * as AuthApi from './apiHooks/auth';
import * as CommissionApi from './apiHooks/commission';
import * as ContactAdminApi from './apiHooks/contactAdmin';
import * as InvoiceApi from './apiHooks/invoice';
import { inventoryApi } from './apiHooks/inventory';
import * as NotificationApi from './apiHooks/notification';
import * as PosApi from './apiHooks/pos';
import * as ProductApi from './apiHooks/product';
import * as TicketApi from './apiHooks/ticket';
import * as WalletApi from './apiHooks/wallet';
import toast from 'react-hot-toast';
import type { FormEvent, MouseEvent } from 'react';

export const withFormErrorHandling = (handler: (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLElement>) => Promise<void>) => {
  return async (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLElement>) => {
    event.preventDefault();

    try {
      await handler(event);
    } catch (error: any) {
      const validationErrors = error?.data?.data?.errors;

      if (Array.isArray(validationErrors)) {
        validationErrors.forEach((item: { field?: string; message?: string }) => {
          const field = item?.field ? `${item.field}: ` : '';
          toast.error(`${field}${item?.message || 'Invalid input'}`);
        });
        return;
      }

      toast.error(error?.data?.message || 'Something went wrong.');
    }
  };
};

export { AuthApi, ContactAdminApi, NotificationApi, ProductApi, WalletApi, CommissionApi, InvoiceApi, TicketApi, PosApi, inventoryApi };
