import { Document, Types } from 'mongoose'

export interface ICommissionBreakdownItem {
  componentKey: string
  baseAmount: number
  rate: number
  deductionAmount: number
}

export interface ICommission extends Document {
  userId: Types.ObjectId
  productId: Types.ObjectId
  commissionRate: number
  commissionAmount: number
  invoiceId: Types.ObjectId
  breakdown?: ICommissionBreakdownItem[]
  createdAt: Date
}
