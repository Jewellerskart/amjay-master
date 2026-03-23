import { Document, Types } from 'mongoose'

export interface ICommission extends Document {
  userId: Types.ObjectId
  productId: Types.ObjectId
  commissionRate: number
  commissionAmount: number
  invoiceId: Types.ObjectId
  createdAt: Date
}
