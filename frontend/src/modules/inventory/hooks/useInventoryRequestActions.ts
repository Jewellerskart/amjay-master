import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { InventoryRequestRecord, InventoryRequestStatus, InventoryUsageChoice } from '.';
import { InventoryAssignControlState, InventoryRequestFormState, InventoryStatusControlState } from '../types/forms';

type MutationTrigger<TArg> = (arg: TArg) => { unwrap: () => Promise<unknown> };

type CreateRequestPayload = {
  requiredProducts: number;
  usageChoice: InventoryUsageChoice;
  styleCode: string;
  preferredUsageNote?: string;
  remark?: string;
};

type UpdateStatusPayload = { id: string; payload: { status: InventoryRequestStatus; remark?: string } };

type AssignProductPayload = {
  id: string;
  payload: { productId: string; jewelerId: string; usageChoice: InventoryUsageChoice; remark?: string };
};

interface UseInventoryRequestActionsParams {
  requests: InventoryRequestRecord[];
  createInventoryRequest: MutationTrigger<CreateRequestPayload>;
  updateInventoryRequestStatus: MutationTrigger<UpdateStatusPayload>;
  assignProductToRequest: MutationTrigger<AssignProductPayload>;
  loadAvailableProducts: (params?: { page?: number; limit?: number; styleCode?: string }) => Promise<unknown>;
  refetchRequests: () => Promise<unknown>;
}

const initialRequestForm: InventoryRequestFormState = {
  requiredProducts: 1,
  usageChoice: 'PURCHASE',
  styleCode: '',
  preferredUsageNote: '',
  remark: '',
};

const initialStatusControl: InventoryStatusControlState = {
  requestId: '',
  status: 'OPEN',
  remark: '',
};

const initialAssignControl: InventoryAssignControlState = {
  requestId: '',
  productId: '',
  styleCode: '',
  usageChoice: 'PURCHASE',
  remark: '',
};

const getRequestProgress = (request?: InventoryRequestRecord) => {
  const required = Math.max(1, Number(request?.requiredProducts || 1));
  const assigned = Math.min(required, Math.max(0, Number(request?.assignedCount ?? request?.assignedProductIds?.length ?? 0)));
  const pending = Math.max(0, required - assigned);
  return { required, assigned, pending };
};

export const useInventoryRequestActions = ({ requests, createInventoryRequest, updateInventoryRequestStatus, assignProductToRequest, loadAvailableProducts, refetchRequests }: UseInventoryRequestActionsParams) => {
  const [requestForm, setRequestForm] = useState<InventoryRequestFormState>(initialRequestForm);
  const [statusControl, setStatusControl] = useState<InventoryStatusControlState>(initialStatusControl);
  const [assignControl, setAssignControl] = useState<InventoryAssignControlState>(initialAssignControl);

  const statusIdOptions = useMemo(
    () =>
      requests.map((req) => {
        const progress = getRequestProgress(req);
        return {
          id: req._id,
          label: `${req._id.substring(0, 6)} | ${req.styleCode || 'STYLE'} | ${progress.assigned}/${progress.required} | ${req.status}`,
        };
      }),
    [requests],
  );

  const handleRequestSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!requestForm.requiredProducts || requestForm.requiredProducts <= 0) {
        toast.error('Required products must be greater than zero');
        return;
      }
      if (!requestForm.styleCode.trim()) {
        toast.error('Style code is required');
        return;
      }
      const { requiredProducts, usageChoice, preferredUsageNote, remark, styleCode } = requestForm;
      try {
        await createInventoryRequest({ requiredProducts, usageChoice, preferredUsageNote, remark, styleCode: styleCode.trim().toUpperCase() }).unwrap();

        toast.success('Inventory request created');
        setRequestForm(initialRequestForm);
        await refetchRequests();
      } catch (error: any) {
        toast.error(error?.data?.message || 'Failed to create request');
      }
    },
    [createInventoryRequest, refetchRequests, requestForm],
  );

  const handleStatusUpdate = useCallback(async () => {
    if (!statusControl.requestId) {
      toast.error('Select a request to update');
      return;
    }
    const { status, remark } = statusControl;
    try {
      await updateInventoryRequestStatus({ id: statusControl.requestId, payload: { status, remark } }).unwrap();
      toast.success('Request status updated');

      setStatusControl(initialStatusControl);
      await refetchRequests();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update status');
    }
  }, [refetchRequests, statusControl, updateInventoryRequestStatus]);

  const handleAssignControlChange = useCallback(
    async <K extends keyof InventoryAssignControlState>(key: K, value: InventoryAssignControlState[K]) => {
      if (key === 'requestId') {
        const selected = requests.find((req) => req._id === value);
        const styleCode = selected?.styleCode || '';
        const usageChoice = selected?.usageChoice || 'PURCHASE';
        setAssignControl((prev) => ({ ...prev, requestId: value as string, styleCode, usageChoice, productId: '' }));
        await loadAvailableProducts({ page: 1, limit: 15, styleCode });
        return;
      }

      setAssignControl((prev) => ({ ...prev, [key]: value }));
    },
    [loadAvailableProducts, requests],
  );

  const handleAssignProduct = useCallback(
    async (productIdOverride?: string) => {
      const targetProductId = productIdOverride || assignControl.productId;
      if (!assignControl.requestId || !targetProductId) {
        toast.error('Choose request and product id');
        return;
      }

      const targetRequest = requests.find((req) => req._id === assignControl.requestId);
      const progress = getRequestProgress(targetRequest);
      if (progress.pending <= 0) {
        toast.error('This request is already fulfilled');
        return;
      }
      const targetJewelerId = targetRequest?.requestedBy || '';
      if (!targetJewelerId) {
        toast.error('Cannot determine jeweler for this request');
        return;
      }
      const payload = {
        productId: targetProductId,
        jewelerId: targetJewelerId,
        usageChoice: assignControl.usageChoice,
        remark: assignControl.remark,
      };
      try {
        await assignProductToRequest({ id: assignControl.requestId, payload }).unwrap();
        toast.success('Product assigned to jeweler');

        await loadAvailableProducts({ page: 1, limit: 15, styleCode: targetRequest?.styleCode });
        await refetchRequests();
        setAssignControl((prev) => ({
          ...prev,
          productId: '',
          remark: '',
        }));
      } catch (error: any) {
        toast.error(error?.data?.message || 'Failed to assign product');
      }
    },
    [assignControl, assignProductToRequest, loadAvailableProducts, refetchRequests, requests],
  );

  return {
    requestForm,
    statusControl,
    assignControl,
    statusIdOptions,
    setRequestForm,
    setStatusControl,
    setAssignControl,
    handleAssignControlChange,
    handleRequestSubmit,
    handleStatusUpdate,
    handleAssignProduct,
  };
};
