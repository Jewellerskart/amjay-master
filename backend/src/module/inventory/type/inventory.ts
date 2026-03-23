import { Document, Types } from 'mongoose'

export type InventoryRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED'
export type InventoryUsageChoice = 'PURCHASE' | 'RENT'

export interface IInventoryRequest extends Document {
  requestedBy: Types.ObjectId
  styleCode: string
  status: InventoryRequestStatus
  requiredProducts: number
  usageChoice: InventoryUsageChoice
  preferredUsageNote?: string
  assignedProductId?: Types.ObjectId | null
  assignedTo?: Types.ObjectId | null
  assignedAt?: Date | null
  remark?: string
  createdBy?: Types.ObjectId
  updatedBy?: Types.ObjectId
}
