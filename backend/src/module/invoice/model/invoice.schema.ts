import mongoose, { Schema } from 'mongoose'
import { IInvoice } from '../type/invoice'

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    userPhone: { type: String, required: true, trim: true },
    requestedByEmail: { type: String, default: null, lowercase: true, trim: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PURCHASE_PENDING_PAYMENT', 'ACTIVE', 'PAID', 'RENTED'],
      default: 'PURCHASE_PENDING_PAYMENT',
      index: true,
    },
    type: { type: String, enum: ['purchase', 'rent'], required: true },
    approvedByEmail: { type: String, default: null, lowercase: true, trim: true },
    paidAt: { type: Date, default: null },
    paidByEmail: { type: String, default: null, lowercase: true, trim: true },
    productSnapshot: { type: Schema.Types.Mixed, default: null },
    liveRateAtCreation: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
)

InvoiceSchema.index({ status: 1, type: 1 })
InvoiceSchema.index({ userEmail: 1, status: 1, createdAt: -1 })
InvoiceSchema.index({ createdAt: -1 })

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema, 'invoice')
