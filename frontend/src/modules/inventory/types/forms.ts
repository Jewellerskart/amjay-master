import { InventoryRequestStatus, InventoryUsageChoice } from '../hooks';

export interface InventoryRequestFormState {
  requiredProducts: number;
  usageChoice: InventoryUsageChoice;
  styleCode: string;
  preferredUsageNote: string;
  remark: string;
}

export interface InventoryStatusControlState {
  requestId: string;
  status: InventoryRequestStatus;
  remark: string;
}

export interface InventoryAssignControlState {
  requestId: string;
  productId: string;
  styleCode?: string;
  usageChoice: InventoryUsageChoice;
  amount: string;
  remark: string;
}
