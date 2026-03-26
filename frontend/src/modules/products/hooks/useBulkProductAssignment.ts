import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import type { ProductRow } from '../../inventory/types/types';

type AssignProductHandler = (product: ProductRow, options?: { toUserId?: string; quantity?: number }) => Promise<boolean>;

interface UseBulkProductAssignmentParams {
  canAssign: boolean;
  products: ProductRow[];
  onAssignProduct: AssignProductHandler;
  onAfterAssign?: () => void | Promise<void>;
}

export const useBulkProductAssignment = ({
  canAssign,
  products,
  onAssignProduct,
  onAfterAssign,
}: UseBulkProductAssignmentParams) => {
  const [bulkJewelerId, setBulkJewelerId] = useState('');

  const assignSelected = useCallback(
    async (selectedIds: string[]) => {
      if (!canAssign) return;
      if (!bulkJewelerId) {
        toast.error('Select a jeweler for bulk assignment');
        return;
      }

      const selectedProducts = products.filter((product) => selectedIds.includes(product._id));
      if (!selectedProducts.length) {
        toast.error('Select at least one product');
        return;
      }

      let assignedCount = 0;
      for (const product of selectedProducts) {
        const success = await onAssignProduct(product, { toUserId: bulkJewelerId, quantity: 1 });
        if (success) assignedCount += 1;
      }

      if (assignedCount > 0) {
        toast.success(`${assignedCount} product(s) assigned`);
      }
      setBulkJewelerId('');
      if (onAfterAssign) {
        await onAfterAssign();
      }
    },
    [bulkJewelerId, canAssign, onAfterAssign, onAssignProduct, products],
  );

  return { bulkJewelerId, setBulkJewelerId, assignSelected };
};
