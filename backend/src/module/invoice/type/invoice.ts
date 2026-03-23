import { Document, Types } from 'mongoose'

export type InvoiceStatus = 'PURCHASE_PENDING_PAYMENT' | 'ACTIVE' | 'PAID' | 'RENTED'
export type InvoiceType = 'purchase' | 'rent'

export interface IInvoice extends Document {
  productId: Types.ObjectId
  userEmail: string
  userPhone: string
  amount: number
  status: InvoiceStatus
  type: InvoiceType
  requestedByEmail?: string | null
  approvedByEmail?: string | null
  paidAt?: Date | null
  paidByEmail?: string | null
  productSnapshot?: any | null
  liveRateAtCreation?: number | null
  createdAt: Date
  updatedAt: Date
}
