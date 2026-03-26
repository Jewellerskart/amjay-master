export type InventoryUsageChoice = 'PURCHASE' | 'MEMO' | 'RENT'
export type InventoryRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED'

export interface InventoryRequestRecord {
  _id: string
  requestedBy?: string
  requestedByName?: string
  styleCode?: string
  requiredProducts: number
  usageChoice: InventoryUsageChoice
  preferredUsageNote?: string
  remark?: string
  status: InventoryRequestStatus
  assignedProductId?: string
  assignedProductIds?: string[]
  assignedCount?: number
  pendingProducts?: number
  assignedTo?: string
  assignedToName?: string
  assignedAt?: string
  createdAt?: string
  updatedAt?: string
}
