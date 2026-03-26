import mongoose, { Schema } from 'mongoose'

interface IOrderTransaction extends mongoose.Document {
  productId: mongoose.Types.ObjectId
  jewelerId: mongoose.Types.ObjectId
  invoiceId: mongoose.Types.ObjectId
  amount: number
  finalPrice: number
  choice: 'PURCHASE' | 'MEMO'
  status: 'SOLD'
  soldBy?: mongoose.Types.ObjectId | null
  productSnapshot?: unknown
  createdAt: Date
  updatedAt: Date
}

const OrderTransactionSchema = new Schema<IOrderTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    jewelerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    amount: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    choice: { type: String, enum: ['PURCHASE', 'MEMO'], required: true },
    status: { type: String, enum: ['SOLD'], default: 'SOLD', index: true },
    soldBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    productSnapshot: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

OrderTransactionSchema.index({ createdAt: -1 })
OrderTransactionSchema.index({ jewelerId: 1, createdAt: -1 })

export const OrderTransactionModel = mongoose.model<IOrderTransaction>('OrderTransaction', OrderTransactionSchema, 'orders-transactions')
