export type InventoryUsageChoice = 'PURCHASE' | 'RENT'
export type InventoryRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED'

export interface InventoryRequestRecord {
  _id: string
  requestedBy?: string
  styleCode?: string
  requiredProducts: number
  usageChoice: InventoryUsageChoice
  preferredUsageNote?: string
  remark?: string
  status: InventoryRequestStatus
  assignedProductId?: string
  assignedTo?: string
  assignedAt?: string
  createdAt?: string
  updatedAt?: string
}
