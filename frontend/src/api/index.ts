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
import type { ApiResponse, ValidationErrorItem } from './types';

type ApiErrorShape = {
  data?: ApiResponse<{ errors?: ValidationErrorItem[] }>;
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getApiError = (error: unknown): ApiErrorShape | null => {
  if (!isObject(error) || !('data' in error)) {
    return null;
  }

  const nextData = (error as { data?: unknown }).data;
  return isObject(nextData) ? ({ data: nextData as ApiResponse<{ errors?: ValidationErrorItem[] }> } as ApiErrorShape) : null;
};

export const withFormErrorHandling = (handler: (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLElement>) => Promise<void>) => {
  return async (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLElement>) => {
    event.preventDefault();

    try {
      await handler(event);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      const validationErrors = apiError?.data?.data?.errors;

      if (Array.isArray(validationErrors)) {
        validationErrors.forEach((item) => {
          const field = item?.field ? `${item.field}: ` : '';
          toast.error(`${field}${item?.message || 'Invalid input'}`);
        });
        return;
      }

      toast.error(apiError?.data?.message || 'Something went wrong.');
    }
  };
};

export { AuthApi, ContactAdminApi, NotificationApi, ProductApi, WalletApi, CommissionApi, InvoiceApi, TicketApi, PosApi, inventoryApi };
