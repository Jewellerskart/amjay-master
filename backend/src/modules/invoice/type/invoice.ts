import { Document, Types } from 'mongoose'

export type InvoiceStatus = 'PURCHASE_PENDING_PAYMENT' | 'MEMO_PENDING_PAYMENT' | 'ACTIVE' | 'PAID' | 'RENTED'
export type InvoiceType = 'purchase' | 'memo' | 'rent'

export interface IInvoiceCommissionComponent {
  componentKey: string
  baseAmount: number
  rate: number
  deductionAmount: number
}

export interface IInvoice extends Document {
  productId: Types.ObjectId
  userEmail: string
  userPhone: string
  amount: number
  grossAmount: number
  taxAmount: number
  taxPercent: number
  commissionTotal: number
  commissionBreakdown: IInvoiceCommissionComponent[]
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
