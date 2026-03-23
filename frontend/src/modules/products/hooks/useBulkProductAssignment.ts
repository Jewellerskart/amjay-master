import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import type { ProductRow } from '../../inventory/types/types';

type AssignProductHandler = (product: ProductRow, options?: { toUserId?: string; quantity?: number }) => Promise<void>;

interface UseBulkProductAssignmentParams {
  canAssign: boolean;
  products: ProductRow[];
  assignQtyByProductId: Record<string, string>;
  onAssignProduct: AssignProductHandler;
  onAfterAssign?: () => void | Promise<void>;
}

export const useBulkProductAssignment = ({
  canAssign,
  products,
  assignQtyByProductId,
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

      for (const product of selectedProducts) {
        const quantity = Number(assignQtyByProductId[product._id] || 1);
        await onAssignProduct(product, { toUserId: bulkJewelerId, quantity });
      }

      toast.success('Selected products assigned');
      setBulkJewelerId('');
      if (onAfterAssign) {
        await onAfterAssign();
      }
    },
    [assignQtyByProductId, bulkJewelerId, canAssign, onAfterAssign, onAssignProduct, products],
  );

  return { bulkJewelerId, setBulkJewelerId, assignSelected };
};
